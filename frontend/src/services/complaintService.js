import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

export const complaintService = {
  admin: {
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

    create: async (formData) => {
      const { data } = await api.post(
        endpoints.admin.complaints.root,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data;
    },
  },

  client: {
    list: async (params = {}) => {
      const { data } = await api.get(endpoints.client.complaints.root, {
        params,
      });
      return data.complaints ?? data;
    },

    getById: async (complaintId) => {
      const { data } = await api.get(
        endpoints.client.complaints.byId(complaintId)
      );
      return data.complaint;
    },

    create: async (formData) => {
      const { data } = await api.post(
        endpoints.client.complaints.root,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data;
    },

    update: async (complaintId, formData) => {
      const { data } = await api.put(
        endpoints.client.complaints.byId(complaintId),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data;
    },

    remove: async (complaintId) => {
      const { data } = await api.delete(
        endpoints.client.complaints.byId(complaintId)
      );
      return data;
    },
  },

  technician: {
    assignmentsDashboard: async () => {
      const { data } = await api.get(endpoints.technician.assignments.root);

      if (data?.success) {
        const payload = data.data || {};
        const complaints = Array.isArray(payload.complaints)
          ? payload.complaints
          : [];

        const stats = payload.stats || {
          total: complaints.length,
          assigned: complaints.filter((c) => c.status === "assigned").length,
          inProgress: complaints.filter((c) => c.status === "in-progress")
            .length,
          completed: complaints.filter((c) => c.status === "resolved").length,
        };

        return { complaints, stats };
      }

      const complaints =
        data?.complaints ?? data?.assignments ?? data?.data?.complaints ?? [];

      const safeComplaints = Array.isArray(complaints) ? complaints : [];
      const stats = {
        total: safeComplaints.length,
        assigned: safeComplaints.filter((c) => c.status === "assigned").length,
        inProgress: safeComplaints.filter((c) => c.status === "in-progress")
          .length,
        completed: safeComplaints.filter((c) => c.status === "resolved").length,
      };

      return { complaints: safeComplaints, stats };
    },

    assignments: async () => {
      const { data } = await api.get(endpoints.technician.assignments.root);

      if (data?.success && Array.isArray(data?.data?.complaints)) {
        return data.data.complaints;
      }

      return data.complaints ?? data.assignments ?? data;
    },

    resolvedAssignments: async () => {
      const { data } = await api.get(endpoints.technician.assignments.resolved);

      if (data?.success && Array.isArray(data?.data?.complaints)) {
        return data.data.complaints;
      }

      return data.complaints ?? data.assignments ?? data;
    },

    myComplaints: async () => {
      const { data } = await api.get(endpoints.technician.complaints.my);
      return data.complaints ?? data;
    },

    create: async (formData) => {
      const { data } = await api.post(
        endpoints.technician.complaints.root,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return data;
    },

    updateAssignmentStatus: async (complaintId, payload) => {
      const { data } = await api.patch(
        endpoints.technician.assignments.updateStatus(complaintId),
        payload,
        payload instanceof FormData
          ? { headers: { "Content-Type": "multipart/form-data" } }
          : undefined
      );
      return data;
    },
  },
};

export const resolveComplaintDetailEndpoint = ({ role, id }) => {
  if (role === "admin") return endpoints.admin.complaints.byId(id);
  if (role === "client") return endpoints.client.complaints.byId(id);
  return null;
};
