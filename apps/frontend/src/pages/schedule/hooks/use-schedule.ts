import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createSchedule, listSchedulesByMonth, type CreateScheduleInput } from '@/pages/schedule/api/schedule-api';
import { toast } from '@/stores/toast-store';

const SCHEDULE_KEY = ['schedules'] as const;

export function useSchedulesByMonth(year: number, month: number) {
  return useQuery({
    queryKey: [...SCHEDULE_KEY, year, month],
    queryFn: () => listSchedulesByMonth(year, month),
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateScheduleInput) => createSchedule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      toast({ title: '일정이 등록되었습니다.', variant: 'success' });
    },
  });
}
