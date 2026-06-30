import { useQuery } from "@tanstack/react-query";

import { statsService } from "../services/statsService";

export const statsKeys = {
  all: ["stats"],

  complaintsRoot: () => [...statsKeys.all, "complaints"],
  complaintsCreatedVsResolved: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "created-vs-resolved",
    params,
  ],
  complaintsCreatedVsResolvedDrilldown: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "created-vs-resolved-drilldown",
    params,
  ],
  complaintsStatusFunnel: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "status-funnel",
    params,
  ],
  complaintsStatusFunnelDrilldown: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "status-funnel-drilldown",
    params,
  ],
  complaintsStoreLeaderboard: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "store-leaderboard",
    params,
  ],
  complaintsStoreLeaderboardDrilldown: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "store-leaderboard-drilldown",
    params,
  ],
  complaintsTimeToResolve: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "time-to-resolve",
    params,
  ],
  complaintsAging: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "aging",
    params,
  ],
  complaintsAgingDrilldown: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "aging-drilldown",
    params,
  ],
  complaintsTimeToResolveDrilldown: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "ttr-drilldown",
    params,
  ],

  techniciansRoot: () => [...statsKeys.all, "technicians"],
  techniciansAssignedVsResolved: (params = {}) => [
    ...statsKeys.techniciansRoot(),
    "assigned-vs-resolved",
    params,
  ],
  techniciansDrilldown: (params = {}) => [
    ...statsKeys.techniciansRoot(),
    "drilldown",
    params,
  ],
};

const reportQueryDefaults = {
  staleTime: 0,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

export const useComplaintsCreatedVsResolvedStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsCreatedVsResolved(params || {}),
    queryFn: () => statsService.complaints.createdVsResolved(params || {}),
    enabled: options.enabled ?? Boolean(params),
  });
};

export const useComplaintsCreatedVsResolvedDrilldownStats = (
  params,
  options = {},
) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsCreatedVsResolvedDrilldown(params || {}),
    queryFn: () =>
      statsService.complaints.createdVsResolvedDrilldown(params || {}),
    enabled: options.enabled ?? Boolean(params?.interval && params?.period),
  });
};

export const useComplaintsStatusFunnelStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsStatusFunnel(params || {}),
    queryFn: () => statsService.complaints.statusFunnel(params || {}),
    enabled: options.enabled ?? Boolean(params),
  });
};

export const useComplaintsStatusFunnelDrilldownStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsStatusFunnelDrilldown(params || {}),
    queryFn: () => statsService.complaints.statusFunnelDrilldown(params || {}),
    enabled: options.enabled ?? Boolean(params?.status),
  });
};

export const useComplaintsStoreLeaderboardStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsStoreLeaderboard(params || {}),
    queryFn: () => statsService.complaints.storeLeaderboard(params || {}),
    enabled: options.enabled ?? Boolean(params),
  });
};

export const useComplaintsStoreLeaderboardDrilldownStats = (
  params,
  options = {},
) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsStoreLeaderboardDrilldown(params || {}),
    queryFn: () =>
      statsService.complaints.storeLeaderboardDrilldown(params || {}),
    enabled: options.enabled ?? Boolean(params?.storeName),
  });
};

export const useComplaintsTimeToResolveStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsTimeToResolve(params || {}),
    queryFn: () => statsService.complaints.timeToResolve(params || {}),
    enabled: options.enabled ?? Boolean(params),
  });
};

export const useComplaintsAgingStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsAging(params || {}),
    queryFn: () => statsService.complaints.aging(params || {}),
    enabled: options.enabled ?? Boolean(params),
  });
};

export const useTechniciansAssignedVsResolvedStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.techniciansAssignedVsResolved(params || {}),
    queryFn: () => statsService.technicians.assignedVsResolved(params || {}),
    enabled: options.enabled ?? Boolean(params),
  });
};

export const useComplaintsAgingDrilldownStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsAgingDrilldown(params || {}),
    queryFn: () => statsService.complaints.agingDrilldown(params || {}),
    enabled: options.enabled ?? Boolean(params?.bucket),
  });
};

export const useComplaintsTimeToResolveDrilldownStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsTimeToResolveDrilldown(params || {}),
    queryFn: () => statsService.complaints.timeToResolveDrilldown(params || {}),
    enabled: options.enabled ?? Boolean(params?.interval && params?.period),
  });
};

export const useTechniciansDrilldownStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.techniciansDrilldown(params || {}),
    queryFn: () => statsService.technicians.drilldown(params || {}),
    enabled: options.enabled ?? Boolean(params?.technicianId),
  });
};
