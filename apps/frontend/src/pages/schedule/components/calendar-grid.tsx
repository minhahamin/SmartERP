import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SCHEDULE_TYPE_LABEL, type ScheduleEvent } from '@/mocks/schedules';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const TYPE_DOT_CLASS: Record<ScheduleEvent['type'], string> = {
  MEETING: 'bg-info text-white',
  VACATION: 'bg-primary text-white',
  BUSINESS_TRIP: 'bg-warning text-white',
  ETC: 'bg-gray-400 text-white',
};

const today = new Date('2026-06-19');

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  events: ScheduleEvent[];
}

function CalendarGrid({ year, month, events }: CalendarGridProps) {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDate = (date: Date) => events.filter((e) => isSameDay(new Date(e.date), date));

  return (
    <div className="grid grid-cols-7 overflow-hidden rounded-md border border-border">
      {WEEKDAYS.map((day) => (
        <div key={day} className="border-b border-border bg-gray-50 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
          {day}
        </div>
      ))}
      {days.map((date) => {
        const dayEvents = eventsByDate(date);
        const visible = dayEvents.slice(0, 3);
        const overflow = dayEvents.length - visible.length;
        const inMonth = isSameMonth(date, monthStart);
        const isToday = isSameDay(date, today);

        return (
          <div
            key={date.toISOString()}
            className={cn(
              'flex min-h-[96px] flex-col gap-1 border-b border-r border-border p-1.5 last:border-r-0',
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
                    <EventDetail event={event} />
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
                        <EventDetail key={event.id} event={event} compact />
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventDetail({ event, compact = false }: { event: ScheduleEvent; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-0.5', !compact && 'text-sm')}>
      <p className="font-medium text-foreground">{event.title}</p>
      <p className="text-xs text-muted-foreground">
        {SCHEDULE_TYPE_LABEL[event.type]} · {event.startTime}–{event.endTime}
      </p>
      {event.location !== '-' && <p className="text-xs text-muted-foreground">{event.location}</p>}
    </div>
  );
}

export { CalendarGrid };
