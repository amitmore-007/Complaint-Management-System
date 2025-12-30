import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

export const equipmentService = {
  list: async () => {
    const { data } = await api.get(endpoints.equipment.list);
    return data.equipment;
  },

  create: async (payload) => {
    const { data } = await api.post(endpoints.equipment.create, payload);
    return data;
  },

  update: async (equipmentId, payload) => {
    const { data } = await api.put(
      endpoints.equipment.byId(equipmentId),
      payload
    );
    return data;
  },

  remove: async (equipmentId) => {
    const { data } = await api.delete(endpoints.equipment.byId(equipmentId));
    return data;
  },

  assetRecords: {
    listAdmin: async () => {
      const { data } = await api.get(endpoints.equipment.records.root);
      return data.records;
    },

    listTechnician: async () => {
      const { data } = await api.get(endpoints.equipment.records.technician);
      return data.records;
    },

    listClient: async () => {
      const { data } = await api.get(endpoints.equipment.records.client);
      return data.records;
    },

    getById: async (recordId) => {
      const { data } = await api.get(
        endpoints.equipment.records.byId(recordId)
      );
      return data.record;
    },

    submit: async (payload) => {
      const { data } = await api.post(
        endpoints.equipment.records.root,
        payload
      );
      return data;
    },

    update: async (recordId, payload) => {
      const { data } = await api.put(
        endpoints.equipment.records.byId(recordId),
        payload
      );
      return data;
    },

    remove: async (recordId) => {
      const { data } = await api.delete(
        endpoints.equipment.records.byId(recordId)
      );
      return data;
    },

    exportExcel: async () => {
      const response = await api.get(endpoints.equipment.records.export, {
        responseType: "blob",
      });
      return response.data;
    },
  },
};
