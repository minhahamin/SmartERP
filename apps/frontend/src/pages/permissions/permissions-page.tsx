import { ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionMatrixTable } from '@/pages/permissions/components/permission-matrix-table';
import { usePermissionMatrix, useTogglePermission } from '@/pages/permissions/hooks/use-permissions';
import { useAuthStore } from '@/stores/auth-store';
import { EMPLOYEES } from '@/mocks/employees';
import { ROLE_LABEL, type RoleName } from '@/types/auth';

const ROLE_OPTIONS = Object.keys(ROLE_LABEL) as RoleName[];

function PermissionsPage() {
  const currentRole = useAuthStore((state) => state.user?.role);
  const { data: matrix, isLoading } = usePermissionMatrix();
  const toggle = useTogglePermission();

  if (currentRole !== 'ADMIN') {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="권한 관리" />
        <EmptyState icon={ShieldAlert} title="권한이 없습니다" description="권한 관리는 ADMIN 역할만 접근할 수 있습니다." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="권한 관리" description="역할별 모듈x액션 권한 매트릭스를 정의합니다." />

      {isLoading || !matrix ? (
        <Skeleton className="h-96" />
      ) : (
        <Tabs defaultValue="ADMIN">
          <TabsList>
            {ROLE_OPTIONS.map((role) => (
              <TabsTrigger key={role} value={role}>
                {ROLE_LABEL[role]}
              </TabsTrigger>
            ))}
          </TabsList>
          {ROLE_OPTIONS.map((role) => {
            const memberCount = EMPLOYEES.filter((e) => e.role === role && e.status !== 'RESIGNED').length;
            return (
              <TabsContent key={role} value={role} className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  이 역할에 속한 인원: <span className="font-medium text-foreground">{memberCount}명</span>
                </p>
                <Card className="overflow-hidden p-0">
                  <PermissionMatrixTable
                    matrix={matrix[role]}
                    disabled={role === 'ADMIN'}
                    onToggle={(moduleKey, action) => toggle.mutate({ role, moduleKey, action })}
                  />
                </Card>
                {role === 'ADMIN' && <p className="text-xs text-muted-foreground">ADMIN 역할의 권한은 시스템 기본값으로 고정되어 있습니다.</p>}
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
}

export { PermissionsPage };
