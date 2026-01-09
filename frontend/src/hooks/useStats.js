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
  complaintsStatusFunnel: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "status-funnel",
    params,
  ],
  complaintsStoreLeaderboard: (params = {}) => [
    ...statsKeys.complaintsRoot(),
    "store-leaderboard",
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

  techniciansRoot: () => [...statsKeys.all, "technicians"],
  techniciansAssignedVsResolved: (params = {}) => [
    ...statsKeys.techniciansRoot(),
    "assigned-vs-resolved",
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

export const useComplaintsStatusFunnelStats = (params, options = {}) => {
  return useQuery({
    ...reportQueryDefaults,
    ...options,
    queryKey: statsKeys.complaintsStatusFunnel(params || {}),
    queryFn: () => statsService.complaints.statusFunnel(params || {}),
    enabled: options.enabled ?? Boolean(params),
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
