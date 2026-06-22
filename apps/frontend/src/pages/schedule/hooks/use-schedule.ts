import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSchedule,
  deleteSchedule,
  listSchedulesByMonth,
  updateSchedule,
  type CreateScheduleInput,
  type UpdateScheduleInput,
} from '@/pages/schedule/api/schedule-api';
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

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateScheduleInput }) => updateSchedule(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      toast({ title: '일정이 수정되었습니다.', variant: 'success' });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_KEY });
      toast({ title: '일정이 삭제되었습니다.', variant: 'success' });
    },
  });
}
