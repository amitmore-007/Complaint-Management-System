import { storeData } from "../data/storeData.js";
import { assetRecordData } from "../data/assetRecordData.js";
import { createHttpError } from "../utils/httpError.js";

/** A pin captured from a fix worse than this would move the whole fence. */
const MAX_PIN_ACCURACY_M = 50;

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
      notifyOnResolve: m?.notifyOnResolve === true,
      approvesVisits: m?.approvesVisits === true,
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

  /**
   * Pin a store on the map, or clear the pin. A store with no pin is never
   * geofenced, so clearing is the per-store escape hatch.
   */
  updateGeofence: async ({ id, latitude, longitude, accuracyMeters, radiusMeters, adminId }) => {
    const store = await storeData.findById(id);
    if (!store) throw createHttpError(404, "Store not found");

    const hasCoordinates = latitude !== undefined && latitude !== null && latitude !== "";

    if (hasCoordinates) {
      const lat = Number(latitude);
      const lng = Number(longitude);

      if (!Number.isFinite(lat) || Math.abs(lat) > 90) {
        throw createHttpError(400, "Latitude must be between -90 and 90");
      }
      if (!Number.isFinite(lng) || Math.abs(lng) > 180) {
        throw createHttpError(400, "Longitude must be between -180 and 180");
      }

      const accuracy = Number(accuracyMeters);
      // A pin captured from a 500m-accurate fix is worse than no pin: it would
      // silently shift the whole fence.
      if (Number.isFinite(accuracy) && accuracy > MAX_PIN_ACCURACY_M) {
        throw createHttpError(
          400,
          `Location is only accurate to about ${Math.round(
            accuracy,
          )}m. Move outside and capture again, or enter the coordinates manually.`,
        );
      }

      store.location = {
        type: "Point",
        coordinates: [lng, lat],
        accuracyMeters: Number.isFinite(accuracy) ? accuracy : undefined,
        capturedBy: adminId,
        capturedAt: new Date(),
      };
    } else {
      store.location = undefined;
    }

    if (radiusMeters !== undefined && radiusMeters !== null && radiusMeters !== "") {
      const radius = Number(radiusMeters);
      if (!Number.isFinite(radius) || radius < 30 || radius > 2000) {
        throw createHttpError(400, "Radius must be between 30 and 2000 metres");
      }
      store.geofenceRadiusMeters = radius;
    }

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
