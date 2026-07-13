import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

export const inventoryService = {
  admin: {
    list: async (params = {}) => {
      const { data } = await api.get(endpoints.admin.inventory.root, {
        params,
      });
      return {
        records: data.records ?? [],
        pagination: data.pagination,
        summary: data.summary,
      };
    },

    create: async (payload) => {
      const { data } = await api.post(endpoints.admin.inventory.root, payload);
      return data.item;
    },

    update: async (id, payload) => {
      const { data } = await api.put(
        endpoints.admin.inventory.byId(id),
        payload
      );
      return data.item;
    },

    remove: async (id) => {
      const { data } = await api.delete(endpoints.admin.inventory.byId(id));
      return data;
    },
  },

  technician: {
    listItemNames: async () => {
      const { data } = await api.get(endpoints.technician.inventory.items);
      return data.items ?? [];
    },
  },
};
