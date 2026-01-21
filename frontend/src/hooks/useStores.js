import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { storeService } from "../services/storeService";

export const storeKeys = {
  all: ["stores"],
  list: (params = {}) => [...storeKeys.all, "list", params],
};

export const useStoresList = (params = {}) => {
  return useQuery({
    queryKey: storeKeys.list(params),
    queryFn: async () => {
      const data = await storeService.list(params);
      return data?.stores || [];
    },
  });
};

export const useUpdateStoreManagers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storeId, managers }) => {
      return storeService.updateManagers(storeId, managers);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.all });
    },
  });
};
