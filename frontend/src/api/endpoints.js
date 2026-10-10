// Centralized API endpoint builders (all paths are relative to VITE_API_URL)

export const endpoints = {
  // Auth is role-agnostic: one set of endpoints, role passed in the body.
  auth: {
    me: "/auth/me",
    sendOtp: "/auth/send-otp",
    verifyOtp: "/auth/verify-otp",
    logoutAllDevices: "/auth/logout-all-devices",
  },

  // One complaint API for every role — the server scopes results by the
  // caller's role, so there is no per-role variant.
  complaints: {
    root: "/complaints",
    bulk: "/complaints/bulk",
    byId: (complaintId) => `/complaints/${complaintId}`,
    duplicate: (complaintId) => `/complaints/${complaintId}/duplicate`,
    assigned: "/complaints/assigned/me",
    assignedResolved: "/complaints/assigned/me/resolved",
    updateStatus: (complaintId) => `/complaints/${complaintId}/status`,
  },

  // Listing is role-scoped server-side; create is technician-only and
  // get/update are admin-only, enforced by route guards.
  billing: {
    root: "/billing",
    byId: (id) => `/billing/${id}`,
  },

  admin: {
    dashboard: {
      stats: "/admin/dashboard/stats",
    },
    // Only genuinely admin-only complaint operations.
    complaints: {
      assign: "/admin/complaints/assign",
      reassign: (complaintId) => `/admin/complaints/${complaintId}/reassign`,
      autoAssign: "/admin/complaints/auto-assign",
      geofenceFlagged: "/admin/complaints/geofence-flagged",
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
    inventory: {
      root: "/admin/inventory",
      byId: (id) => `/admin/inventory/${id}`,
      stockBalance: "/admin/inventory/stock-balance",
    },
    smartDevices: {
      root: "/admin/smart-devices",
      sync: "/admin/smart-devices/sync",
      energy: (deviceId) => `/admin/smart-devices/${deviceId}/energy`,
      power: (deviceId) => `/admin/smart-devices/${deviceId}/power`,
    },
    settings: {
      resolvedNotifyContacts: "/admin/settings/resolved-notify-contacts",
      geofenceMode: "/admin/settings/geofence-mode",
    },
  },

  technician: {
    inventory: {
      items: "/technician/inventory/items",
    },
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
    geofence: (storeId) => `/stores/${storeId}/geofence`,
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
    portal: {
      session: (token) => `/attendance/portal/${token}/session`,
      status:  (token) => `/attendance/portal/${token}/status`,
      record:  (token) => `/attendance/portal/${token}/record`,
    },
  },
  adminUsers: {
    attendanceToken: (userId) => `/admin/users/${userId}/attendance-token`,
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
