import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listAllPermissions, listRolesWithPermissions, setRolePermissions } from '@/pages/permissions/api/permissions-api';
import { toast } from '@/stores/toast-store';

const PERMISSIONS_KEY = ['permissions'] as const;

export function useRolesWithPermissions() {
  return useQuery({ queryKey: [...PERMISSIONS_KEY, 'roles'], queryFn: listRolesWithPermissions });
}

export function useAllPermissions() {
  return useQuery({ queryKey: [...PERMISSIONS_KEY, 'catalog'], queryFn: listAllPermissions });
}

export function useSetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      setRolePermissions(roleId, permissionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERMISSIONS_KEY });
      toast({ title: '권한이 저장되었습니다.', variant: 'success' });
    },
  });
}
