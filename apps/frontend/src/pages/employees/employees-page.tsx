import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/common/pagination';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmployeeFilters } from '@/pages/employees/components/employee-filters';
import { EmployeeTable } from '@/pages/employees/components/employee-table';
import { EmployeeFormDialog } from '@/pages/employees/components/employee-form-dialog';
import { useDeactivateEmployee, useEmployees } from '@/pages/employees/hooks/use-employees';
import type { Employee, EmployeeStatus } from '@/mocks/employees';

const PAGE_SIZE = 8;

function EmployeesPage() {
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  const [deactivateTarget, setDeactivateTarget] = useState<Employee | null>(null);

  const { data, isLoading } = useEmployees({
    search: search || undefined,
    departmentId: departmentId === 'ALL' ? undefined : departmentId,
    status: status === 'ALL' ? undefined : (status as EmployeeStatus),
    page,
    limit: PAGE_SIZE,
  });
  const deactivateEmployee = useDeactivateEmployee();

  const openCreateDialog = () => {
    setEditingEmployee(undefined);
    setFormOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="직원 관리" description="임직원 마스터 데이터를 등록하고 근태·급여·휴가 이력을 관리합니다." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <EmployeeFilters
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          departmentId={departmentId}
          onDepartmentChange={(value) => {
            setDepartmentId(value);
            setPage(1);
          }}
          status={status}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Button onClick={openCreateDialog}>
          <Plus /> 직원 등록
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading || !data ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <EmployeeTable employees={data.items} onEdit={openEditDialog} onDeactivate={setDeactivateTarget} />
        )}
        {data && (
          <div className="px-4 py-3">
            <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
          </div>
        )}
      </Card>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editingEmployee} />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title={`${deactivateTarget?.name} 님을 퇴사 처리할까요?`}
        description="퇴사 처리 후에도 과거 급여/근태 이력은 보존됩니다."
        confirmLabel="퇴사 처리"
        variant="danger"
        loading={deactivateEmployee.isPending}
        onConfirm={() => {
          if (!deactivateTarget) return;
          deactivateEmployee.mutate(deactivateTarget.id, { onSuccess: () => setDeactivateTarget(null) });
        }}
      />
    </div>
  );
}

export { EmployeesPage };
