import { useState } from 'react';
import { CalendarPlus, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { LeaveRequestDialog } from '@/components/common/leave-request-dialog';
import { useLeaveRequests } from '@/pages/profile/hooks/use-leave';
import { getLeaveBalance, LEAVE_TYPE_LABEL } from '@/mocks/leave';

const LEAVE_STATUS_LABEL: Record<string, string> = { PENDING: '승인대기', APPROVED: '승인', REJECTED: '반려' };

interface LeaveSummaryProps {
  employeeId: string;
  /** 본인 프로필 화면에서만 true로 전달 — HR이 타인 기록을 볼 때는 신청 버튼을 숨긴다. */
  allowSubmit?: boolean;
}

function LeaveSummary({ employeeId, allowSubmit = false }: LeaveSummaryProps) {
  const [requestOpen, setRequestOpen] = useState(false);
  const balance = getLeaveBalance(employeeId);
  const { data: leaveRequests, isLoading } = useLeaveRequests(employeeId);

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">총 연차</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{balance.total}일</p>
        </div>
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">사용</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{balance.used}일</p>
        </div>
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">잔여</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-primary">{balance.remaining}일</p>
        </div>
      </div>

      {allowSubmit && (
        <div className="mb-3 flex justify-end">
          <Button size="sm" onClick={() => setRequestOpen(true)}>
            <CalendarPlus /> 연차 신청
          </Button>
        </div>
      )}

      {isLoading || !leaveRequests ? (
        <Skeleton className="h-24" />
      ) : leaveRequests.length === 0 ? (
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
                <td className="py-2 tabular-nums text-muted-foreground">
                  {r.startDate} ~ {r.endDate}
                </td>
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

      {allowSubmit && <LeaveRequestDialog open={requestOpen} onOpenChange={setRequestOpen} employeeId={employeeId} />}
    </div>
  );
}

export { LeaveSummary };
