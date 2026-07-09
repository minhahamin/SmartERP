import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/client';
import { checkIn, checkOut, listMyAttendance } from '@/pages/profile/api/attendance-api';
import { toast } from '@/stores/toast-store';

const ATTENDANCE_KEY = ['attendance'] as const;

function extractErrorMessage(error: unknown, fallback: string): string {
  return axios.isAxiosError<ApiError>(error) ? (error.response?.data.error.message ?? error.message) : fallback;
}

export function useAttendance(employeeId: string | undefined) {
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, employeeId],
    queryFn: () => listMyAttendance(employeeId as string),
    enabled: Boolean(employeeId),
  });
}

export function useCheckIn(employeeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => checkIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, employeeId] });
      toast({ title: '출근 처리되었습니다.', variant: 'success' });
    },
    onError: (error: unknown) => {
      toast({ title: extractErrorMessage(error, '출근 처리에 실패했습니다.'), variant: 'destructive' });
    },
  });
}

export function useCheckOut(employeeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => checkOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, employeeId] });
      toast({ title: '퇴근 처리되었습니다.', variant: 'success' });
    },
    onError: (error: unknown) => {
      toast({ title: extractErrorMessage(error, '퇴근 처리에 실패했습니다.'), variant: 'destructive' });
    },
  });
}
