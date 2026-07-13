import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inventoryService } from "../services/inventoryService";

export const inventoryKeys = {
  all: ["inventory"],

  adminRoot: () => [...inventoryKeys.all, "admin"],
  adminList: (params = {}) => [...inventoryKeys.adminRoot(), params],

  technicianRoot: () => [...inventoryKeys.all, "technician"],
  technicianItemNames: () => [...inventoryKeys.technicianRoot(), "item-names"],
};

export const useAdminInventoryItems = (params = {}) => {
  return useQuery({
    queryKey: inventoryKeys.adminList(params),
    queryFn: () => inventoryService.admin.list(params),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
};

export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => inventoryService.admin.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adminRoot() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.technicianRoot(),
      });
    },
  });
};

export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => inventoryService.admin.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adminRoot() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.technicianRoot(),
      });
    },
  });
};

export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => inventoryService.admin.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.adminRoot() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.technicianRoot(),
      });
    },
  });
};

export const useTechnicianInventoryItemNames = () => {
  return useQuery({
    queryKey: inventoryKeys.technicianItemNames(),
    queryFn: () => inventoryService.technician.listItemNames(),
    staleTime: 0,
    refetchOnMount: "always",
  });
};
