import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isSameDay, startOfMonth, startOfWeek } from 'date-fns';
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
  return (
    <div className={cn('flex flex-col gap-1', !compact && 'text-sm')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium text-foreground">{event.title}</p>
          <p className="text-xs text-muted-foreground">
            {SCHEDULE_TYPE_LABEL[event.type]} · {event.startTime}–{event.endTime}
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
