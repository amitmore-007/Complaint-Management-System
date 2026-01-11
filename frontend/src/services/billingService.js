import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

export const billingService = {
  technician: {
    list: async (params = {}) => {
      const { data } = await api.get(endpoints.technician.billing.root, {
        params,
      });
      return { records: data.records ?? [], pagination: data.pagination };
    },

    create: async (formData) => {
      const { data } = await api.post(
        endpoints.technician.billing.root,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data.record;
    },
  },

  admin: {
    list: async (params = {}) => {
      const { data } = await api.get(endpoints.admin.billing.root, { params });
      return { records: data.records ?? [], pagination: data.pagination };
    },

    getById: async (id) => {
      const { data } = await api.get(endpoints.admin.billing.byId(id));
      return data.record;
    },

    update: async (id, payload) => {
      const { data } = await api.put(endpoints.admin.billing.byId(id), payload);
      return data.record;
    },
  },
};
