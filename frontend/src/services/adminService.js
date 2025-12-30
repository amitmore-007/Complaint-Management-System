import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

export const adminService = {
  dashboardStats: async () => {
    const { data } = await api.get(endpoints.admin.dashboard.stats);
    return data.stats;
  },

  technicians: {
    list: async (params = {}) => {
      const { data } = await api.get(endpoints.admin.technicians.root, {
        params,
      });
      return { technicians: data.technicians, pagination: data.pagination };
    },

    create: async (payload) => {
      const { data } = await api.post(
        endpoints.admin.technicians.root,
        payload
      );
      return data;
    },

    update: async (technicianId, payload) => {
      const { data } = await api.put(
        endpoints.admin.technicians.byId(technicianId),
        payload
      );
      return data;
    },
  },

  clients: {
    list: async (params = {}) => {
      const { data } = await api.get(endpoints.admin.clients.root, { params });
      return { clients: data.clients, pagination: data.pagination };
    },

    create: async (payload) => {
      const { data } = await api.post(endpoints.admin.clients.root, payload);
      return data;
    },

    update: async (clientId, payload) => {
      const { data } = await api.put(
        endpoints.admin.clients.byId(clientId),
        payload
      );
      return data;
    },
  },

  complaints: {
    list: async (params = {}) => {
      const { data } = await api.get(endpoints.admin.complaints.root, {
        params,
      });
      return data.complaints;
    },

    getById: async (complaintId) => {
      const { data } = await api.get(
        endpoints.admin.complaints.byId(complaintId)
      );
      return data.complaint;
    },

    assign: async ({ complaintId, technicianId }) => {
      const { data } = await api.post(endpoints.admin.complaints.assign, {
        complaintId,
        technicianId,
      });
      return data;
    },
  },

  users: {
    toggleStatus: async ({ userId, isActive }) => {
      const { data } = await api.patch(
        endpoints.admin.users.toggleStatus(userId),
        {
          isActive,
        }
      );
      return data;
    },

    remove: async (userId) => {
      const { data } = await api.delete(endpoints.admin.users.byId(userId));
      return data;
    },
  },
};
