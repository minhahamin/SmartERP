import { useState } from 'react';
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAttendance } from '@/pages/profile/hooks/use-attendance';
import type { AttendanceRecord, AttendanceStatus } from '@/pages/profile/api/attendance-api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  NORMAL: '정상',
  LATE: '지각',
  ABSENT: '결근',
  REMOTE: '재택',
  BUSINESS_TRIP: '출장',
  ON_LEAVE: '휴가',
};

const LEGEND: { label: string; className: string }[] = [
  { label: '정상', className: 'bg-gray-400' },
  { label: '지각', className: 'bg-warning' },
  { label: '결근', className: 'bg-red-500' },
  { label: '휴가', className: 'bg-info' },
];

function AttendanceCalendar({ employeeId }: { employeeId: string }) {
  const { data: attendance, isLoading } = useAttendance(employeeId);
  const [cursor, setCursor] = useState(() => new Date());

  if (isLoading || !attendance) {
    return <Skeleton className="h-[420px]" />;
  }

  const recordByDate = new Map(attendance.map((r) => [r.date, r]));

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  const goToMonth = (delta: number) => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => goToMonth(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-24 text-center text-sm font-semibold text-foreground">{format(cursor, 'yyyy년 M월')}</span>
          <Button variant="ghost" size="icon" onClick={() => goToMonth(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>
          오늘
        </Button>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-md border border-border">
        {WEEKDAYS.map((day) => (
          <div key={day} className="border-b border-border bg-gray-50 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        {days.map((date) => {
          const key = format(date, 'yyyy-MM-dd');
          const record: AttendanceRecord | undefined = recordByDate.get(key);
          const inMonth = isSameMonth(date, monthStart);
          const isToday = isSameDay(date, today);
          const hasRealAttendance = record && record.status !== 'ON_LEAVE' && record.checkInAt;

          return (
            <div
              key={key}
              className={cn(
                'flex min-h-[84px] flex-col gap-1 border-b border-r border-border p-1.5 last:border-r-0',
                !inMonth && 'bg-gray-50/60',
              )}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-full text-xs',
                  isToday && 'bg-primary font-semibold text-primary-foreground',
                  !isToday && inMonth && 'text-foreground',
                  !inMonth && 'text-muted-foreground/50',
                )}
              >
                {format(date, 'd')}
              </span>
              <div className="flex flex-col gap-0.5">
                {hasRealAttendance && (
                  <Badge
                    variant={record.status === 'LATE' ? 'warning' : record.status === 'ABSENT' ? 'danger' : 'default'}
                    className="w-fit"
                  >
                    {record.checkInAt} {ATTENDANCE_LABEL[record.status]}
                  </Badge>
                )}
                {record?.leave && (
                  <Badge variant="info" className="w-fit">
                    {record.leave.label}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', item.className)} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export { AttendanceCalendar };
