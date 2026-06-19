import { Badge } from '@/components/ui/badge';
import { generateAttendance, type AttendanceStatus } from '@/mocks/attendance';

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  NORMAL: '정상',
  LATE: '지각',
  ABSENT: '결근',
  REMOTE: '재택',
  BUSINESS_TRIP: '출장',
};

function AttendanceHistoryTable({ employeeId }: { employeeId: string }) {
  const attendance = generateAttendance(employeeId);

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
        {attendance.map((a) => (
          <tr key={a.date} className="border-b border-border last:border-0">
            <td className="py-2 tabular-nums">{a.date}</td>
            <td className="py-2 tabular-nums text-muted-foreground">{a.checkInAt ?? '-'}</td>
            <td className="py-2 tabular-nums text-muted-foreground">{a.checkOutAt ?? '-'}</td>
            <td className="py-2 tabular-nums text-muted-foreground">
              {Math.floor(a.workMinutes / 60)}시간 {a.workMinutes % 60}분
            </td>
            <td className="py-2">
              <Badge variant={a.status === 'LATE' ? 'warning' : a.status === 'ABSENT' ? 'danger' : 'default'}>
                {ATTENDANCE_LABEL[a.status]}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { AttendanceHistoryTable };
