import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

const multipart = (payload) =>
  payload instanceof FormData
    ? { headers: { "Content-Type": "multipart/form-data" } }
    : undefined;

/**
 * One complaint API for every role. The server scopes what you can see and
 * touch from the JWT, so there is no admin/client/technician variant here —
 * this used to be three near-identical blocks.
 */
export const complaintService = {
  list: async (params = {}) => {
    const { data } = await api.get(endpoints.complaints.root, { params });
    return {
      complaints: data.complaints ?? [],
      pagination: data.pagination ?? { total: 0, page: 1, pages: 1 },
    };
  },

  // Walks every page. Only for the Excel export, which genuinely needs them all.
  listAll: async ({ limit = 500 } = {}) => {
    const all = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const { data } = await api.get(endpoints.complaints.root, {
        params: { page, limit },
      });

      const complaints = Array.isArray(data?.complaints) ? data.complaints : [];
      all.push(...complaints);

      const serverPages = Number(data?.pagination?.pages);
      totalPages =
        Number.isFinite(serverPages) && serverPages > 0
          ? serverPages
          : complaints.length < limit
            ? page
            : page + 1;

      page += 1;
    }

    return all;
  },

  getById: async (complaintId) => {
    const { data } = await api.get(endpoints.complaints.byId(complaintId));
    return data.complaint;
  },

  create: async (formData) => {
    const { data } = await api.post(endpoints.complaints.root, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  createBulk: async (complaints) => {
    const { data } = await api.post(endpoints.complaints.bulk, { complaints });
    return data;
  },

  update: async (complaintId, payload) => {
    const { data } = await api.put(
      endpoints.complaints.byId(complaintId),
      payload,
      multipart(payload),
    );
    return data;
  },

  remove: async (complaintId) => {
    const { data } = await api.delete(endpoints.complaints.byId(complaintId));
    return data;
  },

  duplicate: async (complaintId, payload) => {
    const { data } = await api.post(
      endpoints.complaints.duplicate(complaintId),
      payload,
    );
    return data;
  },

  // Technician assignment views
  assignments: {
    dashboard: async () => {
      const { data } = await api.get(endpoints.complaints.assigned);
      const payload = data?.data ?? {};
      const complaints = Array.isArray(payload.complaints)
        ? payload.complaints
        : [];

      return {
        complaints,
        stats: payload.stats ?? {
          total: complaints.length,
          assigned: complaints.filter((c) => c.status === "assigned").length,
          inProgress: complaints.filter((c) => c.status === "in-progress").length,
          completed: complaints.filter((c) => c.status === "resolved").length,
        },
      };
    },

    list: async () => {
      const { data } = await api.get(endpoints.complaints.assigned);
      return data?.data?.complaints ?? [];
    },

    resolved: async () => {
      const { data } = await api.get(endpoints.complaints.assignedResolved);
      return data?.data?.complaints ?? [];
    },

    updateStatus: async (complaintId, payload) => {
      const { data } = await api.patch(
        endpoints.complaints.updateStatus(complaintId),
        payload,
        multipart(payload),
      );
      return data;
    },
  },

  // Genuinely admin-only operations
  admin: {
    assign: async ({ complaintId, technicianId }) => {
      const { data } = await api.post(endpoints.admin.complaints.assign, {
        complaintId,
        technicianId,
      });
      return data;
    },

    reassign: async ({ complaintId, technicianId }) => {
      const { data } = await api.patch(
        endpoints.admin.complaints.reassign(complaintId),
        { technicianId },
      );
      return data;
    },

    getAutoAssignSetting: async () => {
      const { data } = await api.get(endpoints.admin.complaints.autoAssign);
      return Boolean(data?.setting?.autoAssignEnabled);
    },

    updateAutoAssignSetting: async (enabled) => {
      const { data } = await api.patch(endpoints.admin.complaints.autoAssign, {
        enabled,
      });
      return Boolean(data?.setting?.autoAssignEnabled);
    },

    getResolvedNotifyContacts: async () => {
      const { data } = await api.get(
        endpoints.admin.settings.resolvedNotifyContacts,
      );
      return data.setting;
    },

    updateResolvedNotifyContacts: async (contacts) => {
      const { data } = await api.patch(
        endpoints.admin.settings.resolvedNotifyContacts,
        { contacts },
      );
      return data.setting;
    },
  },
};
