import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { complaintService } from "../services/complaintService";
import { adminKeys } from "./useAdmin";
import { statsKeys } from "./useStats";
import { appendPositionTo } from "../utils/geolocation";
import { enqueueStatusUpdate, isNetworkError } from "../utils/offlineQueue";

export const dashboardKeys = {
  technicianAssignments: () => ["dashboard", "technician", "assignments"],
};

// Query keys
export const complaintKeys = {
  all: ["complaints"],
  lists: () => [...complaintKeys.all, "list"],
  list: (filters) => [...complaintKeys.lists(), filters],
  details: () => [...complaintKeys.all, "detail"],
  detail: (id) => [...complaintKeys.details(), id],
  technician: () => [...complaintKeys.all, "technician"],
  technicianAssignments: () => [...complaintKeys.technician(), "assignments"],
  technicianResolved: () => [...complaintKeys.technician(), "resolved"],
  technicianMyComplaints: () => [...complaintKeys.technician(), "my"],
  client: () => [...complaintKeys.all, "client"],
  clientList: (filters) => [...complaintKeys.client(), "list", filters],
  autoAssignSetting: () => [...complaintKeys.all, "auto-assign-setting"],
  resolvedNotifyContacts: () => [...complaintKeys.all, "resolved-notify-contacts"],
  geofenceMode: () => [...complaintKeys.all, "geofence-mode"],
  geofenceFlagged: () => [...complaintKeys.all, "geofence-flagged"],
};

// Statuses that must be performed at the store, so they carry a position.
const GEOFENCED_STATUSES = ["in-progress", "resolved"];

const newIdempotencyKey = () =>
  crypto.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Fetch complaints for the current page/filters (Admin)
export const useComplaints = (filters = {}) => {
  return useQuery({
    queryKey: complaintKeys.list(filters),
    queryFn: () => complaintService.list(filters),
    // Admin needs to see technician-created complaints without hard refresh.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 20_000,
    placeholderData: keepPreviousData,
  });
};

// Fetch single complaint by ID
export const useComplaint = (id, options = {}) => {
  return useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: () => complaintService.getById(id),
    enabled: !!id && options.enabled !== false,
    staleTime: 0, // Always fetch fresh data for complaint details
  });
};

// Fetch assigned complaints (Technician)
export const useAssignedComplaints = () => {
  return useQuery({
    queryKey: complaintKeys.technicianAssignments(),
    queryFn: async () => {
      return complaintService.assignments.list();
    },
    // Technician assignments should reflect admin assignments quickly.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 15_000,
  });
};

// Fetch my complaints (Technician)
export const useMyComplaints = () => {
  return useQuery({
    queryKey: complaintKeys.technicianMyComplaints(),
    queryFn: async () => {
      return complaintService.list({ limit: 100 });
    },
  });
};

// Fetch my complaints (Client)
export const useClientComplaints = (filters = {}) => {
  return useQuery({
    queryKey: complaintKeys.clientList(filters),
    queryFn: async () => {
      return complaintService.list(filters);
    },
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Technician dashboard assignments (needs backend stats payload)
export const useTechnicianDashboardAssignments = () => {
  return useQuery({
    queryKey: dashboardKeys.technicianAssignments(),
    queryFn: async () => {
      return complaintService.assignments.dashboard();
    },
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// Fetch resolved complaints (Technician)
export const useResolvedComplaints = () => {
  return useQuery({
    queryKey: complaintKeys.technicianResolved(),
    queryFn: async () => {
      return complaintService.assignments.resolved();
    },
  });
};

// Create complaint
export const useCreateComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (complaintData) => {
      return complaintService.create(complaintData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.client() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useCreateAdminBulkComplaints = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (complaints) => complaintService.createBulk(complaints),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useCreateClientBulkComplaints = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (complaints) => complaintService.createBulk(complaints),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.client() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useCreateTechnicianBulkComplaints = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (complaints) => complaintService.createBulk(complaints),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.technicianMyComplaints() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useUpdateAdminComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ complaintId, payload }) => complaintService.update(complaintId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useUpdateTechnicianComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ complaintId, payload }) => complaintService.update(complaintId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.technicianMyComplaints() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useAdminDeleteComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (complaintId) => complaintService.remove(complaintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useAdminDuplicateComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ complaintId, payload }) => complaintService.duplicate(complaintId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useTechnicianDuplicateComplaint = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ complaintId, payload }) => complaintService.duplicate(complaintId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.technicianMyComplaints() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useCreateAdminComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => complaintService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      // Admin-created complaints can belong to a client; make sure client views
      // (dashboard + my complaints) refresh when the user returns.
      queryClient.invalidateQueries({ queryKey: complaintKeys.client() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useCreateClientComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => complaintService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.client() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      // Admin complaints list should reflect new client complaints.
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useCreateTechnicianComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) =>
      complaintService.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: complaintKeys.technicianMyComplaints(),
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

// Assign complaint (Admin)
export const useAssignComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ complaintId, technicianId }) => {
      return complaintService.admin.assign({ complaintId, technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.technician() });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.technicianAssignments(),
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

// Reassign complaint (Admin) — for already-assigned or in-progress complaints
export const useReassignComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ complaintId, technicianId }) => {
      return complaintService.admin.reassign({ complaintId, technicianId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.technician() });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.technicianAssignments(),
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};

export const useComplaintAutoAssignSetting = () => {
  return useQuery({
    queryKey: complaintKeys.autoAssignSetting(),
    queryFn: async () => complaintService.admin.getAutoAssignSetting(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
};

export const useUpdateComplaintAutoAssignSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (enabled) =>
      complaintService.admin.updateAutoAssignSetting(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: complaintKeys.autoAssignSetting(),
      });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
    },
  });
};

export const useResolvedNotifyContacts = () => {
  return useQuery({
    queryKey: complaintKeys.resolvedNotifyContacts(),
    queryFn: () => complaintService.admin.getResolvedNotifyContacts(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
};

export const useUpdateResolvedNotifyContacts = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contacts) =>
      complaintService.admin.updateResolvedNotifyContacts(contacts),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: complaintKeys.resolvedNotifyContacts(),
      });
    },
  });
};

export const useGeofenceMode = () => {
  return useQuery({
    queryKey: complaintKeys.geofenceMode(),
    queryFn: () => complaintService.admin.getGeofenceMode(),
    staleTime: 0,
    refetchOnMount: "always",
  });
};

export const useUpdateGeofenceMode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mode) => complaintService.admin.updateGeofenceMode(mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.geofenceMode() });
    },
  });
};

export const useGeofenceFlaggedComplaints = () => {
  return useQuery({
    queryKey: complaintKeys.geofenceFlagged(),
    queryFn: () => complaintService.admin.listGeofenceFlagged(),
    staleTime: 0,
    refetchOnMount: "always",
  });
};

/**
 * Update complaint status (Technician).
 *
 * Owns the two things every status update needs and no page should have to
 * repeat: the location reading the server geofences against, and an
 * idempotency key so a retry — whether the technician's or the offline
 * queue's — cannot apply the same update twice.
 *
 * Resolves with `{ queued: true }` when the request never reached the server;
 * the update is safely in IndexedDB and callers must not treat that as done.
 */
export const useUpdateComplaintStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    /**
     * Overrides the global `mutations: { retry: 1 }`. A rejection here is a
     * decision, not a glitch — off-site, wrong transition, missing notes — and
     * retrying it just sends a second doomed request that shows the technician
     * a different error than the real one. Genuine connection failures are
     * handled below by the offline queue, which is a better answer than an
     * immediate retry on a connection that is still down.
     */
    retry: false,
    mutationFn: async ({ id, payload }) => {
      const isFormData = payload instanceof FormData;
      const status = isFormData ? payload.get("status") : payload?.status;

      if (isFormData && GEOFENCED_STATUSES.includes(status)) {
        if (!payload.has("idempotencyKey")) {
          payload.append("idempotencyKey", newIdempotencyKey());
        }

        /**
         * A failed capture is not a client-side veto. The server owns the
         * decision: it blocks only in "enforce" mode, and only for a store
         * that is actually pinned — so send the update anyway and let it
         * answer. Blocking here would stop work at every unpinned store the
         * moment a technician denied the permission prompt.
         */
        try {
          await appendPositionTo(payload);
        } catch (error) {
          console.warn("Location capture failed:", error.code, error.message);
          payload.set("locationErrorCode", error.code ?? "UNKNOWN");
        }
      }

      try {
        return await complaintService.assignments.updateStatus(id, payload);
      } catch (error) {
        if (isFormData && isNetworkError(error)) {
          await enqueueStatusUpdate({ complaintId: id, formData: payload });
          return { queued: true };
        }
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.technician() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.client() });
      queryClient.invalidateQueries({
        queryKey: dashboardKeys.technicianAssignments(),
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({
        queryKey: complaintKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: statsKeys.all });
    },
  });
};
