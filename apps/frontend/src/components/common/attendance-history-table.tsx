import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAttendance } from '@/pages/profile/hooks/use-attendance';
import type { AttendanceStatus } from '@/pages/profile/api/attendance-api';

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  NORMAL: '정상',
  LATE: '지각',
  ABSENT: '결근',
  REMOTE: '재택',
  BUSINESS_TRIP: '출장',
  ON_LEAVE: '휴가',
};

/**
 * HR이 직원 상세에서 보는 화면과 본인이 "내 프로필"에서 보는 화면이 같은 데이터(오늘 출퇴근 포함)를
 * 공유하도록 useAttendance(employeeId)를 통해 조회한다. 체크인/체크아웃 버튼은 여기에 없다 —
 * 본인 화면에서만 AttendanceCheckInCard로 별도 노출한다.
 */
function AttendanceHistoryTable({ employeeId }: { employeeId: string }) {
  const { data: attendance, isLoading } = useAttendance(employeeId);

  if (isLoading || !attendance) {
    return <Skeleton className="h-40" />;
  }

  return (
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
        {attendance.map((a) => {
          const notStartedToday = !a.leave && !a.checkInAt && !a.checkOutAt && a.workMinutes === 0;
          const hasRealAttendance = a.status !== 'ON_LEAVE';
          return (
            <tr key={a.date} className="border-b border-border last:border-0">
              <td className="py-2 tabular-nums">{a.date}</td>
              <td className="py-2 tabular-nums text-muted-foreground">{a.checkInAt ?? '-'}</td>
              <td className="py-2 tabular-nums text-muted-foreground">{a.checkOutAt ?? '-'}</td>
              <td className="py-2 tabular-nums text-muted-foreground">
                {notStartedToday ? '-' : `${Math.floor(a.workMinutes / 60)}시간 ${a.workMinutes % 60}분`}
              </td>
              <td className="py-2">
                <div className="flex flex-wrap items-center gap-1">
                  {notStartedToday && <Badge>출근 전</Badge>}
                  {!notStartedToday && hasRealAttendance && (
                    <Badge variant={a.status === 'LATE' ? 'warning' : a.status === 'ABSENT' ? 'danger' : 'default'}>
                      {ATTENDANCE_LABEL[a.status]}
                    </Badge>
                  )}
                  {a.leave && (
                    <Badge variant="info">
                      {a.leave.label}
                      {a.leave.startTime && a.leave.endTime ? ` ${a.leave.startTime}~${a.leave.endTime}` : ''}
                    </Badge>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export { AttendanceHistoryTable };
