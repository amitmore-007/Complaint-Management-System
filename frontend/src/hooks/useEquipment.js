import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentService } from "../services/equipmentService";

// Query keys
export const equipmentKeys = {
  all: ["equipment"],
  list: () => [...equipmentKeys.all, "list"],
  recordsRoot: () => [...equipmentKeys.all, "records"],
  records: (scope = "admin") => [...equipmentKeys.recordsRoot(), scope],
  record: (id) => [...equipmentKeys.all, "record", id],
};

// Fetch equipment list
export const useEquipmentList = () => {
  return useQuery({
    queryKey: equipmentKeys.list(),
    queryFn: async () => {
      return equipmentService.list();
    },
  });
};

// Create equipment
export const useCreateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipmentData) => {
      return equipmentService.create(equipmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.list() });
    },
  });
};

// Update equipment
export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...equipmentData }) => {
      return equipmentService.update(id, equipmentData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.list() });
    },
  });
};

// Delete equipment
export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      return equipmentService.remove(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.list() });
    },
  });
};

// Fetch asset records
export const useAssetRecords = (options = {}) => {
  const scope = options.scope || options.role || "admin";

  return useQuery({
    queryKey: equipmentKeys.records(scope),
    queryFn: async () => {
      if (scope === "technician")
        return equipmentService.assetRecords.listTechnician();
      if (scope === "client") return equipmentService.assetRecords.listClient();
      return equipmentService.assetRecords.listAdmin();
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
};

// Fetch single asset record
export const useAssetRecord = (id) => {
  return useQuery({
    queryKey: equipmentKeys.record(id),
    queryFn: async () => {
      return equipmentService.assetRecords.getById(id);
    },
    enabled: !!id,
  });
};

// Submit asset record
export const useSubmitAssetRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordData) => {
      return equipmentService.assetRecords.submit(recordData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.recordsRoot() });
      queryClient.invalidateQueries({
        queryKey: equipmentKeys.records("admin"),
      });
      queryClient.invalidateQueries({
        queryKey: equipmentKeys.records("technician"),
      });
      queryClient.invalidateQueries({
        queryKey: equipmentKeys.records("client"),
      });
    },
  });
};

// Update asset record
export const useUpdateAssetRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...recordData }) => {
      return equipmentService.assetRecords.update(id, recordData);
    },
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: equipmentKeys.record(id) });
      await queryClient.cancelQueries({
        queryKey: equipmentKeys.recordsRoot(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.recordsRoot() });
    },
  });
};

// Delete asset record
export const useDeleteAssetRecord = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables) => {
      const recordId =
        typeof variables === "string" ? variables : variables?.id;
      return equipmentService.assetRecords.remove(recordId);
    },
    onMutate: async (variables) => {
      const recordId =
        typeof variables === "string" ? variables : variables?.id;
      const scope =
        typeof variables === "object" && variables?.scope
          ? variables.scope
          : "admin";

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: equipmentKeys.records(scope),
      });

      // Snapshot previous value
      const previousRecords = queryClient.getQueryData(
        equipmentKeys.records(scope)
      );

      // Optimistically update
      queryClient.setQueryData(equipmentKeys.records(scope), (old) =>
        old?.filter((record) => record._id !== recordId)
      );

      return { previousRecords, scope };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(
        equipmentKeys.records(context.scope || "admin"),
        context.previousRecords
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.recordsRoot() });
    },
  });
};

// Export asset records to Excel
export const useExportAssetRecords = () => {
  return useMutation({
    mutationFn: async () => {
      return equipmentService.assetRecords.exportExcel();
    },
  });
};
