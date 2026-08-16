/**
 * Offline queue for technician status updates.
 *
 * Sites lose signal constantly, and a start/resolve that fails on the network
 * would otherwise be retyped — or tapped twice, uploading its photos twice.
 * So a request that never reached the server is parked in IndexedDB (which,
 * unlike localStorage, stores File/Blob natively) and replayed when the
 * connection returns. Every entry carries the idempotency key it was built
 * with, so a replay of something the server did receive is a no-op there.
 */

const DB_NAME = "cms-offline";
const DB_VERSION = 1;
const STORE = "status-updates";

/** Past this, a queued update is stale enough that replaying it misleads. */
const MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1000;

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const runTransaction = async (mode, work) => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;

    try {
      result = work(store);
    } catch (error) {
      transaction.abort();
      db.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      db.close();
      resolve(result?.result ?? result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

/** Split FormData into plain fields and files so it survives a round trip. */
const serializeFormData = (formData) => {
  const fields = [];
  const files = [];

  for (const [key, value] of formData.entries()) {
    if (value instanceof File || value instanceof Blob) {
      files.push({ key, value, name: value.name ?? "upload" });
    } else {
      fields.push([key, value]);
    }
  }

  return { fields, files };
};

const deserializeFormData = ({ fields, files }) => {
  const formData = new FormData();
  for (const [key, value] of fields) formData.append(key, value);
  for (const file of files) formData.append(file.key, file.value, file.name);
  return formData;
};

/** True when the request never reached the server — the only queueable case. */
export const isNetworkError = (error) =>
  !error?.response &&
  (error?.code === "ERR_NETWORK" ||
    error?.code === "ECONNABORTED" ||
    error?.message === "Network Error" ||
    !navigator.onLine);

export const enqueueStatusUpdate = async ({ complaintId, formData }) => {
  const { fields, files } = serializeFormData(formData);

  await runTransaction("readwrite", (store) =>
    store.put({
      id: `${complaintId}-${fields.find(([k]) => k === "idempotencyKey")?.[1] ?? Date.now()}`,
      complaintId,
      fields,
      files,
      queuedAt: Date.now(),
    }),
  );
};

export const countQueuedStatusUpdates = async () => {
  const entries = await runTransaction("readonly", (store) => store.getAll());
  return (entries ?? []).length;
};

const removeEntry = (id) =>
  runTransaction("readwrite", (store) => store.delete(id));

/**
 * Replay everything queued. Entries are dropped once the server has answered
 * — success or a real rejection — and kept only while the network is still
 * down. `send` is injected so this module stays free of API imports.
 *
 * @returns {{ synced: number, failed: number, pending: number }}
 */
export const flushStatusUpdateQueue = async (send) => {
  const entries = (await runTransaction("readonly", (store) => store.getAll())) ?? [];

  let synced = 0;
  let failed = 0;
  let pending = 0;

  for (const entry of entries) {
    if (Date.now() - entry.queuedAt > MAX_ENTRY_AGE_MS) {
      await removeEntry(entry.id);
      failed += 1;
      continue;
    }

    const formData = deserializeFormData(entry);
    // Tells the server this reading was captured offline, so its freshness
    // check allows for the time spent queued. Distance is unaffected.
    formData.set("queuedOffline", "true");

    try {
      await send({ complaintId: entry.complaintId, formData });
      await removeEntry(entry.id);
      synced += 1;
    } catch (error) {
      if (isNetworkError(error)) {
        // Still offline — leave it for the next attempt.
        pending += 1;
        continue;
      }
      // The server answered and refused. Retrying will not change that.
      console.error("Offline status update rejected:", error);
      await removeEntry(entry.id);
      failed += 1;
    }
  }

  return { synced, failed, pending };
};
