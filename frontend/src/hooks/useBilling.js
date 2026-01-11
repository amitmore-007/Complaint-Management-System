import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingService } from "../services/billingService";

export const billingKeys = {
  all: ["billing"],

  technicianRoot: () => [...billingKeys.all, "technician"],
  technicianList: (params = {}) => [...billingKeys.technicianRoot(), params],

  adminRoot: () => [...billingKeys.all, "admin"],
  adminList: (params = {}) => [...billingKeys.adminRoot(), params],
  adminDetail: (id) => [...billingKeys.adminRoot(), "detail", id],
};

export const useTechnicianBillingRecords = (params = {}) => {
  return useQuery({
    queryKey: billingKeys.technicianList(params),
    queryFn: () => billingService.technician.list(params),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
};

export const useCreateBillingRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData) => billingService.technician.create(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.technicianRoot() });
      // Also refresh admin lists if already opened in another tab
      queryClient.invalidateQueries({ queryKey: billingKeys.adminRoot() });
    },
  });
};

export const useAdminBillingRecords = (params = {}) => {
  return useQuery({
    queryKey: billingKeys.adminList(params),
    queryFn: () => billingService.admin.list(params),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
};

export const useAdminBillingRecord = (id, options = {}) => {
  return useQuery({
    queryKey: billingKeys.adminDetail(id),
    queryFn: () => billingService.admin.getById(id),
    enabled: !!id && options.enabled !== false,
    staleTime: 0,
  });
};

export const useUpdateAdminBillingRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => billingService.admin.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: billingKeys.adminRoot() });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: billingKeys.adminDetail(variables.id),
        });
      }
    },
  });
};
