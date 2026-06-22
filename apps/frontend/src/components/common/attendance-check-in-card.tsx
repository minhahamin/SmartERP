import { CheckCircle2, LogIn, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendance, useCheckIn, useCheckOut } from '@/pages/profile/hooks/use-attendance';
import { TODAY } from '@/pages/profile/api/attendance-api';

function AttendanceCheckInCard({ employeeId }: { employeeId: string }) {
  const { data: attendance, isLoading } = useAttendance(employeeId);
  const checkIn = useCheckIn(employeeId);
  const checkOut = useCheckOut(employeeId);

  if (isLoading || !attendance) {
    return <Skeleton className="h-24" />;
  }

  const today = attendance.find((a) => a.date === TODAY);
  const hasCheckedIn = Boolean(today?.checkInAt);
  const hasCheckedOut = Boolean(today?.checkOutAt);

  return (
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-xs text-muted-foreground">오늘 ({TODAY})</p>
        {!hasCheckedIn ? (
          <p className="mt-0.5 text-sm font-medium text-foreground">아직 출근하지 않았습니다.</p>
        ) : (
          <p className="mt-0.5 flex items-center gap-2 text-sm text-foreground">
            <span>
              출근 <span className="font-semibold tabular-nums">{today?.checkInAt}</span>
            </span>
            {hasCheckedOut && (
              <span>
                · 퇴근 <span className="font-semibold tabular-nums">{today?.checkOutAt}</span>
              </span>
            )}
            {hasCheckedOut && (
              <span className="flex items-center gap-1 text-success-foreground">
                <CheckCircle2 className="size-3.5" /> 근무 완료
              </span>
            )}
          </p>
        )}
      </div>

      {!hasCheckedIn && (
        <Button onClick={() => checkIn.mutate()} loading={checkIn.isPending}>
          <LogIn /> 출근하기
        </Button>
      )}
      {hasCheckedIn && !hasCheckedOut && (
        <Button variant="secondary" onClick={() => checkOut.mutate()} loading={checkOut.isPending}>
          <LogOut /> 퇴근하기
        </Button>
      )}
    </Card>
  );
}

export { AttendanceCheckInCard };
