import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listLeaveRequests, submitLeaveRequest, type SubmitLeaveRequestInput } from '@/pages/profile/api/leave-api';
import { toast } from '@/stores/toast-store';

const LEAVE_KEY = ['leave-requests'] as const;

export function useLeaveRequests(employeeId: string | undefined) {
  return useQuery({
    queryKey: [...LEAVE_KEY, employeeId],
    queryFn: () => listLeaveRequests(employeeId as string),
    enabled: Boolean(employeeId),
  });
}

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitLeaveRequestInput) => submitLeaveRequest(input),
    onSuccess: (request) => {
      queryClient.invalidateQueries({ queryKey: [...LEAVE_KEY, request.employeeId] });
      toast({ title: '연차 신청이 등록되었습니다.', description: '승인 대기 상태로 접수되었습니다.', variant: 'success' });
    },
  });
}
