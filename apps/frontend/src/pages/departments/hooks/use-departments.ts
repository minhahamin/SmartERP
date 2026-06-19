import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDepartment,
  listDepartments,
  updateDepartment,
  type CreateDepartmentInput,
  type UpdateDepartmentInput,
} from '@/pages/departments/api/departments-api';
import { toast } from '@/stores/toast-store';

const DEPARTMENTS_KEY = ['departments'] as const;

export function useDepartments() {
  return useQuery({ queryKey: DEPARTMENTS_KEY, queryFn: listDepartments });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDepartmentInput) => createDepartment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
      toast({ title: '부서가 추가되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDepartmentInput }) => updateDepartment(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEPARTMENTS_KEY });
      toast({ title: '부서 정보가 변경되었습니다.', variant: 'success' });
    },
  });
}
