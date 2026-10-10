import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

export const smartDeviceService = {
  admin: {
    list: async () => {
      const { data } = await api.get(endpoints.admin.smartDevices.root);
      return {
        devices: data.devices ?? [],
        syncError: data.syncError ?? null,
        apiUsage: data.apiUsage ?? null,
      };
    },

    sync: async () => {
      const { data } = await api.post(endpoints.admin.smartDevices.sync);
      return {
        devices: data.devices ?? [],
        syncError: data.syncError ?? null,
        apiUsage: data.apiUsage ?? null,
      };
    },

    getEnergy: async (deviceId, granularity) => {
      const { data } = await api.get(
        endpoints.admin.smartDevices.energy(deviceId),
        { params: { granularity } }
      );
      return { buckets: data.buckets ?? [], totalKwh: data.totalKwh ?? 0 };
    },

    getPower: async (deviceId, hours) => {
      const { data } = await api.get(
        endpoints.admin.smartDevices.power(deviceId),
        { params: { hours } }
      );
      return data.intervals ?? [];
    },
  },
};
