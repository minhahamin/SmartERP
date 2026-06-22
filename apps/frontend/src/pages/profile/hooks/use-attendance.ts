import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { checkIn, checkOut, listMyAttendance } from '@/pages/profile/api/attendance-api';
import { toast } from '@/stores/toast-store';

const ATTENDANCE_KEY = ['attendance'] as const;

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
    mutationFn: () => checkIn(employeeId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, employeeId] });
      toast({ title: '출근 처리되었습니다.', variant: 'success' });
    },
  });
}

export function useCheckOut(employeeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => checkOut(employeeId as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...ATTENDANCE_KEY, employeeId] });
      toast({ title: '퇴근 처리되었습니다.', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });
}
