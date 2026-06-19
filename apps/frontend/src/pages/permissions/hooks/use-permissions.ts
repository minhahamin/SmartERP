import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPermissionMatrix, togglePermission } from '@/pages/permissions/api/permissions-api';
import type { PermissionAction } from '@/mocks/permissions';
import type { RoleName } from '@/types/auth';
import { toast } from '@/stores/toast-store';

const PERMISSIONS_KEY = ['permissions', 'matrix'] as const;

export function usePermissionMatrix() {
  return useQuery({ queryKey: PERMISSIONS_KEY, queryFn: getPermissionMatrix });
}

export function useTogglePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, moduleKey, action }: { role: RoleName; moduleKey: string; action: PermissionAction }) =>
      togglePermission(role, moduleKey, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY });
      toast({ title: '권한이 저장되었습니다.', variant: 'success' });
    },
  });
}
