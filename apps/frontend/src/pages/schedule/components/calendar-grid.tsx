import { differenceInCalendarDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthStore } from '@/stores/auth-store';
import { SCHEDULE_TYPE_LABEL, type ScheduleEvent } from '@/pages/schedule/api/schedule-api';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const TYPE_DOT_CLASS: Record<ScheduleEvent['type'], string> = {
  MEETING: 'bg-info text-white',
  VACATION: 'bg-primary text-white',
  BUSINESS_TRIP: 'bg-warning text-white',
  ETC: 'bg-gray-400 text-white',
};

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  events: ScheduleEvent[];
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (event: ScheduleEvent) => void;
}

/** "YYYY-MM-DD"를 로컬 자정 Date로 파싱한다 (new Date(string)은 UTC로 해석돼 자정 근처에서 하루 밀릴 수 있음) */
function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

interface BarSegment {
  event: ScheduleEvent;
  row: number;
  startCol: number; // 0-6, 해당 주 안에서의 시작 열
  span: number; // 몇 칸에 걸쳐 그릴지
  roundedStart: boolean; // 이 조각이 실제 시작일인지(이전 주부터 이어지는 중이 아닌지)
  roundedEnd: boolean; // 이 조각이 실제 종료일인지(다음 주로 이어지지 않는지)
}

function CalendarGrid({ year, month, events, onEdit, onDelete }: CalendarGridProps) {
  const user = useAuthStore((state) => state.user);
  /** docs/02 권한 매트릭스: ADMIN/HR_MANAGER는 전체 일정 CRUD, 그 외 역할은 본인이 등록한 일정만 수정/삭제 가능 */
  const canManage = (event: ScheduleEvent) => user?.role === 'ADMIN' || user?.role === 'HR_MANAGER' || event.ownerId === user?.id;

  const today = new Date();
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  // 여러 날에 걸친 일정(연차 승인 시 자동 등록되는 휴가 등)은 주간 캘린더를 가로지르는 바로 그리고,
  // 하루짜리 일정은 기존처럼 해당 날짜 칸 안에 작은 배지로 표시한다.
  const multiDayEvents = events
    .filter((e) => e.endDate !== e.date)
    .map((e) => ({ event: e, startDay: parseDateOnly(e.date), endDay: parseDateOnly(e.endDate) }))
    .sort(
      (a, b) =>
        a.startDay.getTime() - b.startDay.getTime() ||
        b.endDay.getTime() - b.startDay.getTime() - (a.endDay.getTime() - a.startDay.getTime()),
    );
  const singleDayEvents = events.filter((e) => e.endDate === e.date);

  // 겹치는 기간의 이벤트는 서로 다른 줄(row)에 배정한다(구간 그래프 채색: 각 줄이 마지막으로 사용된
  // 종료일보다 시작일이 늦으면 재사용, 아니면 새 줄 생성). 같은 이벤트는 여러 주에 걸쳐도 같은 줄을 유지해
  // 주가 바뀌어도 시각적으로 이어져 보이게 한다.
  const rowLastEndDate: Date[] = [];
  const eventRow = new Map<string, number>();
  for (const { event, startDay, endDay } of multiDayEvents) {
    let row = rowLastEndDate.findIndex((end) => end < startDay);
    if (row === -1) {
      row = rowLastEndDate.length;
      rowLastEndDate.push(endDay);
    } else {
      rowLastEndDate[row] = endDay;
    }
    eventRow.set(event.id, row);
  }

  const barsForWeek = (week: Date[]): BarSegment[] => {
    const weekStart = week[0];
    const weekEnd = week[6];
    return multiDayEvents
      .filter(({ startDay, endDay }) => startDay <= weekEnd && endDay >= weekStart)
      .map(({ event, startDay, endDay }) => {
        const clipStart = startDay < weekStart ? weekStart : startDay;
        const clipEnd = endDay > weekEnd ? weekEnd : endDay;
        return {
          event,
          row: eventRow.get(event.id) ?? 0,
          startCol: differenceInCalendarDays(clipStart, weekStart),
          span: differenceInCalendarDays(clipEnd, clipStart) + 1,
          roundedStart: isSameDay(clipStart, startDay),
          roundedEnd: isSameDay(clipEnd, endDay),
        };
      });
  };

  const eventsByDate = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return singleDayEvents.filter((e) => e.date === key);
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border">
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((day) => (
          <div key={day} className="border-b border-border bg-gray-50 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      {weeks.map((week, weekIndex) => {
        const bars = barsForWeek(week);
        const barRowCount = bars.length > 0 ? Math.max(...bars.map((b) => b.row)) + 1 : 0;
        const restRow = barRowCount + 2; // 1행: 날짜 숫자, 2..N+1행: 바, 마지막 행: 하루짜리 일정 목록

        return (
          <div
            key={weekIndex}
            className={cn('grid grid-cols-7', weekIndex > 0 && 'border-t border-border')}
            style={{ gridTemplateRows: `auto repeat(${barRowCount}, auto) 1fr` }}
          >
            {week.map((date, colIndex) => (
              <div
                key={`bg-${date.toISOString()}`}
                className={cn('border-r border-border last:border-r-0', !isSameMonth(date, monthStart) && 'bg-gray-50/60')}
                style={{ gridColumn: colIndex + 1, gridRow: '1 / -1' }}
              />
            ))}

            {week.map((date, colIndex) => {
              const isToday = isSameDay(date, today);
              const inMonth = isSameMonth(date, monthStart);
              return (
                <div key={`num-${date.toISOString()}`} className="p-1.5 pb-0.5" style={{ gridColumn: colIndex + 1, gridRow: 1 }}>
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
                </div>
              );
            })}

            {bars.map((bar) => (
              <div
                key={`${bar.event.id}-${weekIndex}`}
                className="min-w-0 px-0.5 py-px"
                style={{ gridColumn: `${bar.startCol + 1} / span ${bar.span}`, gridRow: bar.row + 2 }}
              >
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'block w-full truncate px-1.5 py-0.5 text-left text-[11px] font-medium',
                        TYPE_DOT_CLASS[bar.event.type],
                        bar.roundedStart ? 'rounded-l-sm' : 'rounded-l-none',
                        bar.roundedEnd ? 'rounded-r-sm' : 'rounded-r-none',
                      )}
                    >
                      {bar.event.title}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <EventDetail event={bar.event} canManage={canManage(bar.event)} onEdit={onEdit} onDelete={onDelete} />
                  </PopoverContent>
                </Popover>
              </div>
            ))}

            {week.map((date, colIndex) => {
              const dayEvents = eventsByDate(date);
              const visible = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - visible.length;
              return (
                <div
                  key={`rest-${date.toISOString()}`}
                  className="flex min-h-[40px] flex-col gap-0.5 p-1.5 pt-0.5"
                  style={{ gridColumn: colIndex + 1, gridRow: restRow }}
                >
                  {visible.map((event) => (
                    <Popover key={event.id}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn('truncate rounded-sm px-1.5 py-0.5 text-left text-[11px] font-medium', TYPE_DOT_CLASS[event.type])}
                        >
                          {event.title}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <EventDetail event={event} canManage={canManage(event)} onEdit={onEdit} onDelete={onDelete} />
                      </PopoverContent>
                    </Popover>
                  ))}
                  {overflow > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" className="px-1.5 text-left text-[11px] font-medium text-muted-foreground hover:text-foreground">
                          +{overflow} 더보기
                        </button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <p className="mb-2 text-xs font-semibold text-foreground">{format(date, 'M월 d일')} 일정 ({dayEvents.length})</p>
                        <div className="flex flex-col gap-2">
                          {dayEvents.map((event) => (
                            <EventDetail key={event.id} event={event} compact canManage={canManage(event)} onEdit={onEdit} onDelete={onDelete} />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

interface EventDetailProps {
  event: ScheduleEvent;
  compact?: boolean;
  canManage: boolean;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (event: ScheduleEvent) => void;
}

function EventDetail({ event, compact = false, canManage, onEdit, onDelete }: EventDetailProps) {
  const isMultiDay = event.endDate !== event.date;
  return (
    <div className={cn('flex flex-col gap-1', !compact && 'text-sm')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium text-foreground">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {SCHEDULE_TYPE_LABEL[event.type]} ·{' '}
            {isMultiDay ? `${event.date} ~ ${event.endDate}` : `${event.startTime}–${event.endTime}`}
          </p>
          {event.location !== '-' && <p className="text-xs text-muted-foreground">{event.location}</p>}
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            <PopoverClose asChild>
              <button
                type="button"
                aria-label="일정 수정"
                onClick={() => onEdit(event)}
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            </PopoverClose>
            <PopoverClose asChild>
              <button
                type="button"
                aria-label="일정 삭제"
                onClick={() => onDelete(event)}
                className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </PopoverClose>
          </div>
        )}
      </div>
    </div>
  );
}

export { CalendarGrid };
