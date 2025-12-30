import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminService } from "../services/adminService";

export const adminKeys = {
  all: ["admin"],
  dashboardStats: () => [...adminKeys.all, "dashboard", "stats"],

  techniciansRoot: () => [...adminKeys.all, "technicians"],
  technicians: (params = {}) => [...adminKeys.techniciansRoot(), params],

  clientsRoot: () => [...adminKeys.all, "clients"],
  clients: (params = {}) => [...adminKeys.clientsRoot(), params],
};

export const useAdminDashboardStats = () => {
  return useQuery({
    queryKey: adminKeys.dashboardStats(),
    queryFn: () => adminService.dashboardStats(),
  });
};

export const useAdminTechnicians = (params = {}) => {
  return useQuery({
    queryKey: adminKeys.technicians(params),
    queryFn: () => adminService.technicians.list(params),
  });
};

export const useAdminClients = (params = {}) => {
  return useQuery({
    queryKey: adminKeys.clients(params),
    queryFn: () => adminService.clients.list(params),
  });
};

export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }) =>
      adminService.users.toggleStatus({ userId, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.techniciansRoot() });
      queryClient.invalidateQueries({ queryKey: adminKeys.clientsRoot() });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId) => adminService.users.remove(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.techniciansRoot() });
      queryClient.invalidateQueries({ queryKey: adminKeys.clientsRoot() });
    },
  });
};

export const useCreateTechnician = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => adminService.technicians.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.techniciansRoot() });
    },
  });
};

export const useUpdateTechnician = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ technicianId, payload }) =>
      adminService.technicians.update(technicianId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.techniciansRoot() });
    },
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => adminService.clients.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.clientsRoot() });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, payload }) =>
      adminService.clients.update(clientId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.clientsRoot() });
    },
  });
};
