import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DepartmentTree } from '@/pages/departments/components/department-tree';
import { DepartmentFormDialog } from '@/pages/departments/components/department-form-dialog';
import { useDepartments, useUpdateDepartment } from '@/pages/departments/hooks/use-departments';
import { useEmployees } from '@/pages/employees/hooks/use-employees';
import { EmployeeStatusBadge } from '@/pages/employees/components/employee-status-badge';

function DepartmentsPage() {
  const { data: departments, isLoading } = useDepartments();
  const updateDepartment = useUpdateDepartment();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && departments && departments.length > 0) {
      setSelectedId(departments[0].id);
    }
  }, [departments, selectedId]);

  const effectiveDepartmentId = selectedId ?? departments?.[0]?.id;
  const { data: memberResult } = useEmployees({ departmentId: effectiveDepartmentId, page: 1, limit: 100 });

  if (isLoading || !departments) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="부서 관리" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const selected = departments.find((d) => d.id === selectedId) ?? departments[0];
  const members = memberResult?.items ?? [];
  const manager = members.find((m) => m.id === selected.managerId);
  const possibleParents = departments.filter((d) => d.id !== selected.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="부서 관리"
        description="조직 구조와 부서별 소속 인원을 관리합니다."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> 부서 추가
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[280px_1fr]">
        <Card className="p-2">
          <DepartmentTree departments={departments} selectedId={selected.id} onSelect={setSelectedId} />
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{selected.name}</h2>
              <p className="text-sm text-muted-foreground">소속 인원 {members.length}명</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">부서장</span>
                <Select
                  value={selected.managerId ?? 'NONE'}
                  onValueChange={(value) =>
                    updateDepartment.mutate({ id: selected.id, input: { managerId: value === 'NONE' ? null : value } })
                  }
                >
                  <SelectTrigger size="sm" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">지정 안 함</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">상위 부서</span>
                <Select value={selected.parentId ?? 'NONE'} onValueChange={(value) => setPendingParentId(value)}>
                  <SelectTrigger size="sm" className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">없음(최상위)</SelectItem>
                    {possibleParents.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {manager && (
            <p className="mt-3 text-sm text-muted-foreground">
              부서장: <span className="font-medium text-foreground">{manager.name}</span> ({manager.position})
            </p>
          )}

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2">사번</th>
                <th className="py-2">이름</th>
                <th className="py-2">직급</th>
                <th className="py-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    소속 인원이 없습니다.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="py-2 font-medium text-foreground">{m.employeeNo}</td>
                    <td className="py-2">{m.name}</td>
                    <td className="py-2 text-muted-foreground">{m.position}</td>
                    <td className="py-2">
                      <EmployeeStatusBadge status={m.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <DepartmentFormDialog open={createOpen} onOpenChange={setCreateOpen} departments={departments} />

      <ConfirmDialog
        open={Boolean(pendingParentId)}
        onOpenChange={(open) => !open && setPendingParentId(null)}
        title="상위 부서를 변경할까요?"
        description={`'${selected.name}' 부서의 상위 부서가 변경됩니다.`}
        confirmLabel="변경"
        loading={updateDepartment.isPending}
        onConfirm={() => {
          if (!pendingParentId) return;
          updateDepartment.mutate(
            { id: selected.id, input: { parentId: pendingParentId === 'NONE' ? null : pendingParentId } },
            { onSuccess: () => setPendingParentId(null) },
          );
        }}
      />
    </div>
  );
}

export { DepartmentsPage };
