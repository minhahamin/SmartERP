import { useState } from 'react';
import { CalendarDays, List, Mail, Pencil, Phone } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeStatusBadge } from '@/pages/employees/components/employee-status-badge';
import { MyProfileEditDialog } from '@/pages/profile/components/my-profile-edit-dialog';
import { AttendanceHistoryTable } from '@/components/common/attendance-history-table';
import { AttendanceCalendar } from '@/components/common/attendance-calendar';
import { AttendanceCheckInCard } from '@/components/common/attendance-check-in-card';
import { PayrollHistoryTable } from '@/components/common/payroll-history-table';
import { LeaveSummary } from '@/components/common/leave-summary';
import { useEmployee } from '@/pages/employees/hooks/use-employees';
import { useAuthStore } from '@/stores/auth-store';
import { roleLabel } from '@/types/auth';
import { cn } from '@/lib/utils';

function MyProfilePage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [editOpen, setEditOpen] = useState(false);
  const [attendanceView, setAttendanceView] = useState<'list' | 'calendar'>('list');
  const { data: employee, isLoading } = useEmployee(currentUserId);

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
      <PageHeader title="내 프로필" description="내 정보, 근태, 급여, 휴가 현황을 확인하고 연차를 신청합니다." />

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
            <Pencil /> 내 정보 수정
          </Button>
        </Card>

        <Card className="p-0">
          <Tabs defaultValue="profile" className="gap-0">
            <TabsList className="px-5 pt-4">
              <TabsTrigger value="profile">내 정보</TabsTrigger>
              <TabsTrigger value="attendance">내 근태</TabsTrigger>
              <TabsTrigger value="payroll">급여</TabsTrigger>
              <TabsTrigger value="leave">연차 신청</TabsTrigger>
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
              <p className="mt-4 text-xs text-muted-foreground">
                이름·부서·직급·권한 등은 인사 담당자만 변경할 수 있습니다. 연락처/이메일은 우측 상단 "내 정보 수정"에서 직접 변경하세요.
              </p>
            </TabsContent>

            <TabsContent value="attendance" className="px-5 py-5">
              <AttendanceCheckInCard employeeId={employee.id} />
              <div className="mb-3 flex justify-end">
                <div className="flex items-center rounded-md border border-border p-0.5">
                  <button
                    type="button"
                    aria-label="목록으로 보기"
                    onClick={() => setAttendanceView('list')}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-sm',
                      attendanceView === 'list' ? 'bg-secondary' : 'text-muted-foreground',
                    )}
                  >
                    <List className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="달력으로 보기"
                    onClick={() => setAttendanceView('calendar')}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-sm',
                      attendanceView === 'calendar' ? 'bg-secondary' : 'text-muted-foreground',
                    )}
                  >
                    <CalendarDays className="size-4" />
                  </button>
                </div>
              </div>
              {attendanceView === 'list' ? (
                <AttendanceHistoryTable employeeId={employee.id} />
              ) : (
                <AttendanceCalendar employeeId={employee.id} />
              )}
            </TabsContent>

            <TabsContent value="payroll" className="px-5 py-5">
              <PayrollHistoryTable employeeId={employee.id} />
            </TabsContent>

            <TabsContent value="leave" className="px-5 py-5">
              <LeaveSummary employeeId={employee.id} allowSubmit />
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <MyProfileEditDialog open={editOpen} onOpenChange={setEditOpen} employee={employee} />
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

export { MyProfilePage };
