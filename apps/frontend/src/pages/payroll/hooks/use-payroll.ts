import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  bulkConfirmPayroll,
  bulkPayPayroll,
  generateMonthlyPayroll,
  getMyPayroll,
  listPayroll,
  transitionPayrollStatus,
  updatePayrollItem,
} from '@/pages/payroll/api/payroll-api';
import { toast } from '@/stores/toast-store';

const PAYROLL_KEY = ['payroll'] as const;

export function usePayrollList(year: number, month: number) {
  return useQuery({
    queryKey: [...PAYROLL_KEY, 'list', year, month],
    queryFn: () => listPayroll(year, month),
  });
}

export function useMyPayroll(employeeId: string | undefined) {
  return useQuery({
    queryKey: [...PAYROLL_KEY, 'me', employeeId],
    queryFn: () => getMyPayroll(employeeId as string),
    enabled: Boolean(employeeId),
  });
}

export function useGenerateMonthlyPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => generateMonthlyPayroll(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEY });
      toast({ title: '급여가 일괄 생성되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdatePayrollItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allowances, deductions }: { id: string; allowances: Record<string, number>; deductions: Record<string, number> }) =>
      updatePayrollItem(id, { allowances, deductions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEY });
    },
  });
}

export function useTransitionPayrollStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONFIRMED' | 'PAID' }) => transitionPayrollStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEY });
      toast({
        title: variables.status === 'CONFIRMED' ? '급여가 확정되었습니다.' : '지급 처리되었습니다.',
        variant: 'success',
      });
    },
  });
}

export function useBulkConfirmPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => bulkConfirmPayroll(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEY });
      toast({ title: '전체 급여가 확정되었습니다.', variant: 'success' });
    },
  });
}

export function useBulkPayPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) => bulkPayPayroll(year, month),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYROLL_KEY });
      toast({ title: '전체 급여가 지급 처리되었습니다.', variant: 'success' });
    },
  });
}
