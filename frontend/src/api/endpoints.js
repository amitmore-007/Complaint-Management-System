// Centralized API endpoint builders (all paths are relative to VITE_API_URL)

export const endpoints = {
  admin: {
    auth: {
      me: "/admin/auth/me",
      sendOtp: "/admin/auth/send-otp",
      verifyOtp: "/admin/auth/verify-otp",
      logoutAllDevices: "/admin/auth/logout-all-devices",
    },
    dashboard: {
      stats: "/admin/dashboard/stats",
    },
    complaints: {
      root: "/admin/complaints",
      byId: (complaintId) => `/admin/complaints/${complaintId}`,
      assign: "/admin/complaints/assign",
      reassign: (complaintId) => `/admin/complaints/${complaintId}/reassign`,
      autoAssign: "/admin/complaints/auto-assign",
    },
    technicians: {
      root: "/admin/technicians",
      byId: (technicianId) => `/admin/technicians/${technicianId}`,
    },
    clients: {
      root: "/admin/clients",
      byId: (clientId) => `/admin/clients/${clientId}`,
    },
    users: {
      toggleStatus: (userId) => `/admin/users/${userId}/toggle-status`,
      byId: (userId) => `/admin/users/${userId}`,
    },
    billing: {
      root: "/admin/billing",
      byId: (id) => `/admin/billing/${id}`,
    },
    settings: {
      resolvedNotifyContacts: "/admin/settings/resolved-notify-contacts",
    },
  },

  client: {
    auth: {
      me: "/client/auth/me",
      sendOtp: "/client/auth/send-otp",
      verifyOtp: "/client/auth/verify-otp",
    },
    complaints: {
      root: "/client/complaints",
      byId: (complaintId) => `/client/complaints/${complaintId}`,
    },
  },

  technician: {
    auth: {
      me: "/technician/auth/me",
      sendOtp: "/technician/auth/send-otp",
      verifyOtp: "/technician/auth/verify-otp",
    },
    complaints: {
      root: "/technician/complaints",
      my: "/technician/complaints/my",
    },
    assignments: {
      root: "/technician/assignments",
      resolved: "/technician/resolved-assignments",
      updateStatus: (complaintId) =>
        `/technician/assignments/${complaintId}/status`,
    },
    billing: {
      root: "/technician/billing",
      byId: (id) => `/technician/billing/${id}`,
    },
  },

  complaints: {
    // Common complaint routes (note: most role-specific actions go via /client or /technician)
    my: "/complaints/my",
    assignedMe: "/complaints/assigned/me",
    byId: (complaintId) => `/complaints/${complaintId}`,
    updateStatus: (complaintId) => `/complaints/${complaintId}/status`,
  },

  equipment: {
    list: "/equipment/list",
    create: "/equipment/create",
    byId: (equipmentId) => `/equipment/${equipmentId}`,
    records: {
      root: "/equipment/records",
      export: "/equipment/records/export",
      byId: (recordId) => `/equipment/records/${recordId}`,
      technician: "/equipment/records/technician",
      client: "/equipment/records/client",
    },
  },

  stores: {
    root: "/stores",
    upsert: "/stores/upsert",
    managers: (storeId) => `/stores/${storeId}/managers`,
  },

  attendance: {
    checkIn: '/attendance/check-in',
    checkOut: '/attendance/check-out',
    breakStart: '/attendance/break/start',
    breakEnd: '/attendance/break/end',
    today: '/attendance/today',
    history: '/attendance/history',
    summary: '/attendance/summary',
    all: '/attendance',
  },

  stats: {
    complaintsCreatedVsResolved: "/stats/complaints/created-vs-resolved",
    complaintsCreatedVsResolvedDrilldown:
      "/stats/complaints/created-vs-resolved/drilldown",
    complaintsStatusFunnel: "/stats/complaints/status-funnel",
    complaintsStatusFunnelDrilldown: "/stats/complaints/status-funnel/drilldown",
    complaintsStoreLeaderboard: "/stats/complaints/store-leaderboard",
    complaintsStoreLeaderboardDrilldown:
      "/stats/complaints/store-leaderboard/drilldown",
    complaintsTimeToResolve: "/stats/complaints/time-to-resolve",
    complaintsTimeToResolveDrilldown: "/stats/complaints/time-to-resolve/drilldown",
    complaintsAging: "/stats/complaints/aging",
    complaintsAgingDrilldown: "/stats/complaints/aging/drilldown",
    techniciansAssignedVsResolved: "/stats/technicians/assigned-vs-resolved",
    techniciansDrilldown: "/stats/technicians/drilldown",
  },
};
