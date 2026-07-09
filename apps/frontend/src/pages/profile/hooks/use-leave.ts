import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/client';
import {
  fetchLeaveBalance,
  listLeaveRequests,
  submitLeaveRequest,
  type SubmitLeaveRequestInput,
} from '@/pages/profile/api/leave-api';
import { toast } from '@/stores/toast-store';

const LEAVE_KEY = ['leave-requests'] as const;
const LEAVE_BALANCE_KEY = ['leave-balance'] as const;

export function useLeaveRequests(employeeId: string | undefined) {
  return useQuery({
    queryKey: [...LEAVE_KEY, employeeId],
    queryFn: () => listLeaveRequests(employeeId as string),
    enabled: Boolean(employeeId),
  });
}

export function useLeaveBalance(employeeId: string | undefined) {
  return useQuery({
    queryKey: [...LEAVE_BALANCE_KEY, employeeId],
    queryFn: () => fetchLeaveBalance(employeeId as string),
    enabled: Boolean(employeeId),
  });
}

export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitLeaveRequestInput) => submitLeaveRequest(input),
    onSuccess: (_request, variables) => {
      queryClient.invalidateQueries({ queryKey: [...LEAVE_KEY, variables.employeeId] });
      queryClient.invalidateQueries({ queryKey: [...LEAVE_BALANCE_KEY, variables.employeeId] });
      toast({ title: '연차 신청이 등록되었습니다.', description: '승인 대기 상태로 접수되었습니다.', variant: 'success' });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError<ApiError>(error) ? (error.response?.data.error.message ?? error.message) : '연차 신청에 실패했습니다.';
      toast({ title: message, variant: 'destructive' });
    },
  });
}
