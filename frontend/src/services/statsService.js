import api from "../lib/axios";
import { endpoints } from "../api/endpoints";

const cleanParams = (params = {}) => {
  const out = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "string" && value.trim() === "") return;
    out[key] = value;
  });

  return out;
};

export const statsService = {
  complaints: {
    createdVsResolved: async (params = {}) => {
      const res = await api.get(endpoints.stats.complaintsCreatedVsResolved, {
        params: cleanParams(params),
      });
      return res.data;
    },

    statusFunnel: async (params = {}) => {
      const res = await api.get(endpoints.stats.complaintsStatusFunnel, {
        params: cleanParams(params),
      });
      return res.data;
    },

    storeLeaderboard: async (params = {}) => {
      const res = await api.get(endpoints.stats.complaintsStoreLeaderboard, {
        params: cleanParams(params),
      });
      return res.data;
    },

    timeToResolve: async (params = {}) => {
      const res = await api.get(endpoints.stats.complaintsTimeToResolve, {
        params: cleanParams(params),
      });
      return res.data;
    },

    aging: async (params = {}) => {
      const res = await api.get(endpoints.stats.complaintsAging, {
        params: cleanParams(params),
      });
      return res.data;
    },
  },

  technicians: {
    assignedVsResolved: async (params = {}) => {
      const res = await api.get(endpoints.stats.techniciansAssignedVsResolved, {
        params: cleanParams(params),
      });
      return res.data;
    },
  },
};
