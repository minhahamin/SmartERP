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

const EMPLOYEES_KEY = ['employees'] as const;

export function useEmployees(query: EmployeeListQuery) {
  return useQuery({
    queryKey: [...EMPLOYEES_KEY, 'list', query],
    queryFn: () => listEmployees(query),
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
