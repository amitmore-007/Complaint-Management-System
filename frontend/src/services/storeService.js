import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

export const storeService = {
  list: async (params = {}) => {
    const { data } = await api.get(endpoints.stores.root, { params });
    return data;
  },

  upsertByName: async (storeName) => {
    const { data } = await api.post(endpoints.stores.upsert, { storeName });
    return data.store;
  },

  updateManagers: async (storeId, managers) => {
    const { data } = await api.put(endpoints.stores.managers(storeId), {
      managers,
    });
    return data.store;
  },

  /** Pin the store for geofencing. Pass latitude: null to clear the pin. */
  updateGeofence: async (storeId, { latitude, longitude, accuracyMeters, radiusMeters }) => {
    const { data } = await api.put(endpoints.stores.geofence(storeId), {
      latitude,
      longitude,
      accuracyMeters,
      radiusMeters,
    });
    return data.store;
  },
};
