import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

export const billingService = {
  // Role-scoped server-side: a technician gets their own submissions, an admin
  // gets all of them. Previously two identical functions on two endpoints.
  list: async (params = {}) => {
    const { data } = await api.get(endpoints.billing.root, { params });
    return { records: data.records ?? [], pagination: data.pagination };
  },

  // Technician-only — submits the bill for a complaint they resolved.
  create: async (formData) => {
    const { data } = await api.post(endpoints.billing.root, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.record;
  },

  // Admin-only
  getById: async (id) => {
    const { data } = await api.get(endpoints.billing.byId(id));
    return data.record;
  },

  update: async (id, payload) => {
    const { data } = await api.put(endpoints.billing.byId(id), payload);
    return data.record;
  },
};
