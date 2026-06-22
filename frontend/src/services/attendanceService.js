import api from '../lib/axios';
import { endpoints } from '../api/endpoints';

export const attendanceService = {
  checkIn: async () => {
    const { data } = await api.post(endpoints.attendance.checkIn);
    return data.attendance;
  },

  startBreak: async () => {
    const { data } = await api.post(endpoints.attendance.breakStart);
    return data.attendance;
  },

  endBreak: async () => {
    const { data } = await api.post(endpoints.attendance.breakEnd);
    return data.attendance;
  },

  checkOut: async () => {
    const { data } = await api.post(endpoints.attendance.checkOut);
    return data.attendance;
  },

  getToday: async () => {
    const { data } = await api.get(endpoints.attendance.today);
    return data.attendance;
  },

  listAll: async (params = {}) => {
    const { data } = await api.get(endpoints.attendance.all, { params });
    return data.records;
  },

  getHistory: async (limit = 30) => {
    const { data } = await api.get(endpoints.attendance.history, { params: { limit } });
    return data.records;
  },

  getSummary: async (date) => {
    const { data } = await api.get(endpoints.attendance.summary, { params: date ? { date } : {} });
    return data.summary;
  },
};
