import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../services/attendanceService';

export const attendanceKeys = {
  today: () => ['attendance', 'today'],
  history: () => ['attendance', 'history'],
  summary: (date) => ['attendance', 'summary', date],
  all: (params = {}) => ['attendance', 'all', params],
};

export const useTodayAttendance = () => {
  return useQuery({
    queryKey: attendanceKeys.today(),
    queryFn: attendanceService.getToday,
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

export const useAttendanceHistory = (limit = 30) => {
  return useQuery({
    queryKey: attendanceKeys.history(),
    queryFn: () => attendanceService.getHistory(limit),
    staleTime: 60_000,
  });
};

export const useAttendanceSummary = (date) => {
  return useQuery({
    queryKey: attendanceKeys.summary(date),
    queryFn: () => attendanceService.getSummary(date),
    staleTime: 0,
    refetchInterval: 60_000,
  });
};

// refetchInterval optional — only the management page passes it
export const useAllAttendance = (params = {}, options = {}) => {
  return useQuery({
    queryKey: attendanceKeys.all(params),
    queryFn: () => attendanceService.listAll(params),
    staleTime: 0,
    ...options,
  });
};

const useMutateAttendance = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['attendance', 'summary'] });
    },
  });
};

export const useCheckIn = () => useMutateAttendance(attendanceService.checkIn);
export const useStartBreak = () => useMutateAttendance(attendanceService.startBreak);
export const useEndBreak = () => useMutateAttendance(attendanceService.endBreak);
export const useCheckOut = () => useMutateAttendance(attendanceService.checkOut);
