import { storeData } from "../data/storeData.js";
import { assetRecordData } from "../data/assetRecordData.js";
import { createHttpError } from "../utils/httpError.js";

const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return "";
  const cleaned = String(phoneNumber).replace(/\D/g, "");
  return cleaned.length > 10 ? cleaned.slice(-10) : cleaned;
};

const normalizeManagers = (managers) =>
  (Array.isArray(managers) ? managers : [])
    .map((m) => ({
      name: String(m?.name || "").trim(),
      phoneNumber: normalizePhoneNumber(m?.phoneNumber || ""),
    }))
    .filter((m) => m.name && m.phoneNumber);

export const storeService = {
  /**
   * Get-or-create a store by name. Previously copy-pasted into
   * storeController, equipmentController and utils/seedStores.
   */
  ensureExistsByName: async (storeName) => {
    const name = String(storeName || "").trim();
    if (!name) return null;

    const existing = await storeData.findByExactName(name);
    if (existing) return existing;

    try {
      return await storeData.create({ name });
    } catch {
      // Unique-index race — re-read whoever won.
      return storeData.findByExactName(name);
    }
  },

  /**
   * Asset records carry a free-text storeName, so back-fill any store the
   * dropdown does not know about yet before listing.
   */
  list: async ({ name } = {}) => {
    for (const rawName of await assetRecordData.distinctStoreNames()) {
      await storeService.ensureExistsByName(rawName);
    }

    if (name) {
      return { store: await storeData.findByExactNameWithStatus(name) };
    }

    return { stores: await storeData.listActiveSorted() };
  },

  updateManagers: async ({ id, managers }) => {
    const store = await storeData.findById(id);
    if (!store) throw createHttpError(404, "Store not found");

    store.managers = normalizeManagers(managers);
    await storeData.save(store);

    return store;
  },

  upsertByName: async (storeName) => {
    if (!storeName || !String(storeName).trim()) {
      throw createHttpError(400, "storeName is required");
    }

    return storeService.ensureExistsByName(storeName);
  },
};
