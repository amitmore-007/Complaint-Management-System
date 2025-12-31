import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { complaintService } from "../services/complaintService";
import { adminKeys } from "./useAdmin";

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
};

// Fetch all complaints (Admin)
export const useComplaints = (filters = {}) => {
  return useQuery({
    queryKey: complaintKeys.list(filters),
    queryFn: async () => {
      return complaintService.admin.list(filters);
    },
    // Admin needs to see technician-created complaints without hard refresh.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 20_000,
  });
};

// Fetch single complaint by ID
export const useComplaint = (id, options = {}) => {
  return useQuery({
    queryKey: complaintKeys.detail(id),
    queryFn: async () => {
      const userRole = options.role || "admin";
      if (userRole === "admin") return complaintService.admin.getById(id);
      if (userRole === "client") return complaintService.client.getById(id);

      throw new Error("Complaint detail is not available for technician role");
    },
    enabled: !!id && options.enabled !== false,
    staleTime: 0, // Always fetch fresh data for complaint details
  });
};

// Fetch assigned complaints (Technician)
export const useAssignedComplaints = () => {
  return useQuery({
    queryKey: complaintKeys.technicianAssignments(),
    queryFn: async () => {
      return complaintService.technician.assignments();
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
      return complaintService.technician.myComplaints();
    },
  });
};

// Fetch my complaints (Client)
export const useClientComplaints = (filters = {}) => {
  return useQuery({
    queryKey: complaintKeys.clientList(filters),
    queryFn: async () => {
      return complaintService.client.list(filters);
    },
    // Dashboards should not refetch on every navigation.
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  });
};

// Technician dashboard assignments (needs backend stats payload)
export const useTechnicianDashboardAssignments = () => {
  return useQuery({
    queryKey: dashboardKeys.technicianAssignments(),
    queryFn: async () => {
      return complaintService.technician.assignmentsDashboard();
    },
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: true,
  });
};

// Fetch resolved complaints (Technician)
export const useResolvedComplaints = () => {
  return useQuery({
    queryKey: complaintKeys.technicianResolved(),
    queryFn: async () => {
      return complaintService.technician.resolvedAssignments();
    },
  });
};

// Create complaint
export const useCreateComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (complaintData) => {
      return complaintService.admin.create(complaintData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.client() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
  });
};

export const useCreateAdminComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => complaintService.admin.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
  });
};

export const useCreateClientComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => complaintService.client.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.client() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      // Admin complaints list should reflect new client complaints.
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
    },
  });
};

export const useCreateTechnicianComplaint = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData) => complaintService.technician.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: complaintKeys.technicianMyComplaints(),
      });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
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
      queryClient.invalidateQueries({ queryKey: dashboardKeys.technicianAssignments() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
    },
  });
};

// Update complaint status (Technician)
export const useUpdateComplaintStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      return complaintService.technician.updateAssignmentStatus(id, payload);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: complaintKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.technician() });
      queryClient.invalidateQueries({ queryKey: complaintKeys.client() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.technicianAssignments() });
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() });
      queryClient.invalidateQueries({
        queryKey: complaintKeys.detail(variables.id),
      });
    },
  });
};
