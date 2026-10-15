import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEmployee,
  deactivateEmployee,
  getEmployee,
  listDepartmentOptions,
  listEmployees,
  listRoleOptions,
  updateEmployee,
  type CreateEmployeeInput,
  type EmployeeListQuery,
  type UpdateEmployeeInput,
} from '@/pages/employees/api/employees-api';
import { toast } from '@/stores/toast-store';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/lib/permissions';

const EMPLOYEES_KEY = ['employees'] as const;

/**
 * 직원 목록(GET /users)은 USER:READ 권한이 필요하다. 담당자/업로더 이름 표시용으로 여러 화면이 이 훅을 쓰는데,
 * 권한이 없는 역할(예: 일반 직원)이 그 화면을 열 때마다 403을 맞지 않도록 쿼리 자체를 실행하지 않는다.
 */
export function useEmployees(query: EmployeeListQuery) {
  const canReadUsers = useAuthStore((state) => hasPermission(state.user?.permissions, 'USER'));
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'list', query],
    queryFn: () => listEmployees(query),
    enabled: canReadUsers,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'detail', id],
    queryFn: () => getEmployee(id as string),
    enabled: Boolean(id),
  });
}

export function useDepartmentOptions() {
  return useQuery({ queryKey: ['departments', 'options'], queryFn: listDepartmentOptions });
}

export function useRoleOptions() {
  return useQuery({ queryKey: ['roles', 'options'], queryFn: listRoleOptions });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
      toast({ title: '직원이 등록되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) => updateEmployee(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
      toast({ title: '직원 정보가 수정되었습니다.', variant: 'success' });
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
      toast({ title: '퇴사 처리되었습니다.', variant: 'success' });
    },
  });
}
