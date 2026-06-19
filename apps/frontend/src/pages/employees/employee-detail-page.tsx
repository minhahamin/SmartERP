import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Pencil, UserX } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { EmployeeStatusBadge } from '@/pages/employees/components/employee-status-badge';
import { EmployeeFormDialog } from '@/pages/employees/components/employee-form-dialog';
import { useEmployee } from '@/pages/employees/hooks/use-employees';
import { DEPARTMENTS } from '@/mocks/departments';
import { ROLE_LABEL } from '@/types/auth';
import { generateAttendance } from '@/mocks/attendance';
import { PAYROLL_SEED } from '@/mocks/payroll';
import { getLeaveBalance, getLeaveRequestsByEmployee, LEAVE_TYPE_LABEL } from '@/mocks/leave';
import { ROUTES } from '@/config/routes';

const ATTENDANCE_LABEL: Record<string, string> = { NORMAL: '정상', LATE: '지각', ABSENT: '결근', REMOTE: '재택', BUSINESS_TRIP: '출장' };
const LEAVE_STATUS_LABEL: Record<string, string> = { PENDING: '승인대기', APPROVED: '승인', REJECTED: '반려' };
const PAYROLL_STATUS_LABEL: Record<string, string> = { DRAFT: 'DRAFT', CONFIRMED: 'CONFIRMED', PAID: 'PAID' };

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

  const departmentName = DEPARTMENTS.find((d) => d.id === employee.departmentId)?.name ?? '-';
  const attendance = generateAttendance(employee.id);
  const payrolls = PAYROLL_SEED.filter((p) => p.employeeId === employee.id).sort((a, b) => b.payMonth - a.payMonth);
  const leaveBalance = getLeaveBalance(employee.id);
  const leaveRequests = getLeaveRequestsByEmployee(employee.id);

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
              {departmentName} · {employee.position}
            </p>
          </div>
          <EmployeeStatusBadge status={employee.status} />
          <div className="mt-2 flex w-full flex-col gap-1.5 border-t border-border pt-3 text-left text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Phone className="size-3.5" /> {employee.phone}
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
                <Field label="연락처" value={employee.phone} />
                <Field label="부서" value={departmentName} />
                <Field label="직급" value={employee.position} />
                <Field label="권한(Role)" value={ROLE_LABEL[employee.role]} />
                <Field label="입사일" value={employee.hireDate} />
              </dl>
            </TabsContent>

            <TabsContent value="attendance" className="px-5 py-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2">날짜</th>
                    <th className="py-2">출근</th>
                    <th className="py-2">퇴근</th>
                    <th className="py-2">근무시간</th>
                    <th className="py-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((a) => (
                    <tr key={a.date} className="border-b border-border last:border-0">
                      <td className="py-2 tabular-nums">{a.date}</td>
                      <td className="py-2 tabular-nums text-muted-foreground">{a.checkInAt ?? '-'}</td>
                      <td className="py-2 tabular-nums text-muted-foreground">{a.checkOutAt ?? '-'}</td>
                      <td className="py-2 tabular-nums text-muted-foreground">{Math.floor(a.workMinutes / 60)}시간 {a.workMinutes % 60}분</td>
                      <td className="py-2">
                        <Badge variant={a.status === 'LATE' ? 'warning' : a.status === 'ABSENT' ? 'danger' : 'default'}>
                          {ATTENDANCE_LABEL[a.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TabsContent>

            <TabsContent value="payroll" className="px-5 py-5">
              {payrolls.length === 0 ? (
                <EmptyState icon={UserX} title="급여 이력이 없습니다" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2">귀속월</th>
                      <th className="py-2 text-right">기본급</th>
                      <th className="py-2 text-right">실지급액</th>
                      <th className="py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0">
                        <td className="py-2 tabular-nums">{p.payYear}년 {p.payMonth}월</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">{p.baseSalary.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums font-medium text-foreground">{p.netSalary.toLocaleString()}</td>
                        <td className="py-2">
                          <Badge variant={p.status === 'PAID' ? 'success' : p.status === 'CONFIRMED' ? 'info' : 'default'}>
                            {PAYROLL_STATUS_LABEL[p.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>

            <TabsContent value="leave" className="px-5 py-5">
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-md border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">총 연차</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{leaveBalance.total}일</p>
                </div>
                <div className="rounded-md border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">사용</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">{leaveBalance.used}일</p>
                </div>
                <div className="rounded-md border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">잔여</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{leaveBalance.remaining}일</p>
                </div>
              </div>
              {leaveRequests.length === 0 ? (
                <EmptyState icon={UserX} title="휴가 신청 이력이 없습니다" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2">유형</th>
                      <th className="py-2">기간</th>
                      <th className="py-2">사용일수</th>
                      <th className="py-2">사유</th>
                      <th className="py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0">
                        <td className="py-2">{LEAVE_TYPE_LABEL[r.type]}</td>
                        <td className="py-2 tabular-nums text-muted-foreground">{r.startDate} ~ {r.endDate}</td>
                        <td className="py-2 tabular-nums">{r.days}일</td>
                        <td className="py-2 text-muted-foreground">{r.reason}</td>
                        <td className="py-2">
                          <Badge variant={r.status === 'APPROVED' ? 'success' : r.status === 'REJECTED' ? 'danger' : 'warning'}>
                            {LEAVE_STATUS_LABEL[r.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
