import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeStatusBadge } from '@/pages/employees/components/employee-status-badge';
import { EmployeeFormDialog } from '@/pages/employees/components/employee-form-dialog';
import { useEmployee } from '@/pages/employees/hooks/use-employees';
import { AttendanceHistoryTable } from '@/components/common/attendance-history-table';
import { PayrollHistoryTable } from '@/components/common/payroll-history-table';
import { LeaveSummary } from '@/components/common/leave-summary';
import { roleLabel } from '@/types/auth';
import { ROUTES } from '@/config/routes';

function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const { data: employee, isLoading } = useEmployee(id);

  if (isLoading || !employee) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const departmentName = employee.department?.name ?? '-';

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(ROUTES.employees)}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> 직원 관리
      </button>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <Avatar className="size-16">
            <AvatarFallback className="text-lg">{employee.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-base font-semibold text-foreground">{employee.name}</p>
            <p className="text-sm text-muted-foreground">
              {departmentName} · {employee.position ?? '-'}
            </p>
          </div>
          <EmployeeStatusBadge status={employee.status} />
          <div className="mt-2 flex w-full flex-col gap-1.5 border-t border-border pt-3 text-left text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> {employee.phone ?? '-'}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="size-3.5" /> {employee.email}
            </span>
          </div>
          <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={() => setEditOpen(true)}>
            <Pencil /> 정보 수정
          </Button>
        </Card>

        <Card className="p-0">
          <Tabs defaultValue="profile" className="gap-0">
            <TabsList className="px-5 pt-4">
              <TabsTrigger value="profile">기본정보</TabsTrigger>
              <TabsTrigger value="attendance">근태</TabsTrigger>
              <TabsTrigger value="payroll">급여</TabsTrigger>
              <TabsTrigger value="leave">휴가</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="px-5 py-5">
              <dl className="grid grid-cols-2 gap-y-4 text-sm">
                <Field label="이름" value={employee.name} />
                <Field label="사번" value={employee.employeeNo} />
                <Field label="이메일" value={employee.email} />
                <Field label="연락처" value={employee.phone ?? '-'} />
                <Field label="부서" value={departmentName} />
                <Field label="직급" value={employee.position ?? '-'} />
                <Field label="권한(Role)" value={roleLabel(employee.role.name)} />
                <Field label="입사일" value={employee.hireDate.slice(0, 10)} />
              </dl>
            </TabsContent>

            <TabsContent value="attendance" className="px-5 py-5">
              <AttendanceHistoryTable employeeId={employee.id} />
            </TabsContent>

            <TabsContent value="payroll" className="px-5 py-5">
              <PayrollHistoryTable employeeId={employee.id} />
            </TabsContent>

            <TabsContent value="leave" className="px-5 py-5">
              <LeaveSummary employeeId={employee.id} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <EmployeeFormDialog open={editOpen} onOpenChange={setEditOpen} employee={employee} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}

export { EmployeeDetailPage };
