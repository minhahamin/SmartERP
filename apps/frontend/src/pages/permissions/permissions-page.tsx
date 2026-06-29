import { ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionMatrixTable } from '@/pages/permissions/components/permission-matrix-table';
import { useAllPermissions, useRolesWithPermissions, useSetRolePermissions } from '@/pages/permissions/hooks/use-permissions';
import { buildPermissionIds, toggleAction, type PermissionAction, type RoleWithPermissions } from '@/pages/permissions/api/permissions-api';
import { useAuthStore } from '@/stores/auth-store';
import { roleLabel } from '@/types/auth';

function PermissionsPage() {
  const currentRole = useAuthStore((state) => state.user?.role);
  const { data: roles, isLoading: rolesLoading } = useRolesWithPermissions();
  const { data: catalog, isLoading: catalogLoading } = useAllPermissions();
  const setRolePermissions = useSetRolePermissions();

  if (currentRole !== 'ADMIN') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="권한 관리" />
        <EmptyState icon={ShieldAlert} title="권한이 없습니다" description="권한 관리는 ADMIN 역할만 접근할 수 있습니다." />
      </div>
    );
  }

  const isLoading = rolesLoading || catalogLoading;

  const handleToggle = (role: RoleWithPermissions, moduleKey: string, action: PermissionAction) => {
    if (!catalog) return;
    const nextMatrix = { ...role.matrix, [moduleKey]: toggleAction(role.matrix[moduleKey] ?? [], action) };
    setRolePermissions.mutate({ roleId: role.id, permissionIds: buildPermissionIds(catalog, nextMatrix) });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="권한 관리" description="역할별 모듈x액션 권한 매트릭스를 정의합니다." />

      {isLoading || !roles || roles.length === 0 ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue={roles[0].id}>
          <TabsList>
            {roles.map((role) => (
              <TabsTrigger key={role.id} value={role.id}>
                {roleLabel(role.name)}
              </TabsTrigger>
            ))}
          </TabsList>
          {roles.map((role) => (
            <TabsContent key={role.id} value={role.id} className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                이 역할에 속한 인원: <span className="font-medium text-foreground">{role.memberCount}명</span>
              </p>
              <Card className="overflow-hidden p-0">
                <PermissionMatrixTable
                  matrix={role.matrix}
                  disabled={role.name === 'ADMIN'}
                  onToggle={(moduleKey, action) => handleToggle(role, moduleKey, action)}
                />
              </Card>
              {role.name === 'ADMIN' && (
                <p className="text-xs text-muted-foreground">ADMIN 역할의 권한은 시스템 기본값으로 고정되어 있습니다.</p>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

export { PermissionsPage };
