import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { smartDeviceService } from "../services/smartDeviceService";

// Matches the server's 5-minute status cache; polling faster gains nothing.
// React Query pauses this while the browser tab is hidden.
const LIST_REFETCH_MS = 5 * 60 * 1000;

export const smartDeviceKeys = {
  all: ["smart-devices"],
  list: () => [...smartDeviceKeys.all, "list"],
  energy: (deviceId, granularity) => [
    ...smartDeviceKeys.all,
    "energy",
    deviceId,
    granularity,
  ],
  power: (deviceId, hours) => [...smartDeviceKeys.all, "power", deviceId, hours],
};

export const useSmartDevices = () => {
  return useQuery({
    queryKey: smartDeviceKeys.list(),
    queryFn: () => smartDeviceService.admin.list(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: LIST_REFETCH_MS,
  });
};

export const useSmartDeviceEnergy = (deviceId, granularity) => {
  return useQuery({
    queryKey: smartDeviceKeys.energy(deviceId, granularity),
    queryFn: () => smartDeviceService.admin.getEnergy(deviceId, granularity),
    enabled: Boolean(deviceId),
    staleTime: 0,
    refetchInterval: LIST_REFETCH_MS,
  });
};

export const useSmartDevicePower = (deviceId, hours) => {
  return useQuery({
    queryKey: smartDeviceKeys.power(deviceId, hours),
    queryFn: () => smartDeviceService.admin.getPower(deviceId, hours),
    enabled: Boolean(deviceId),
    staleTime: 0,
    refetchInterval: LIST_REFETCH_MS,
  });
};

export const useSyncSmartDevices = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => smartDeviceService.admin.sync(),
    onSuccess: (data) => {
      queryClient.setQueryData(smartDeviceKeys.list(), data);
      queryClient.invalidateQueries({
        queryKey: [...smartDeviceKeys.all, "energy"],
      });
      queryClient.invalidateQueries({
        queryKey: [...smartDeviceKeys.all, "power"],
      });
    },
  });
};
