import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Factory,
  FileText,
  MessagesSquare,
  TrendingDown,
  UserX,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/components/layout/use-notifications';
import type { AppNotification } from '@/components/layout/notifications-api';

const RED = 'bg-red-100 text-red-600';
const WARNING = 'bg-warning-soft text-warning-foreground';
const INFO = 'bg-info-soft text-info-foreground';
const PRIMARY = 'bg-primary-soft text-primary-soft-foreground';
const NEUTRAL = 'bg-gray-100 text-gray-600';

/**
 * 알림 유형별 아이콘·색. 서버(자동화 작업 등)가 새 유형을 추가해도 화면이 깨지지 않도록, 표에 없는 유형은
 * 기본 아이콘으로 보여준다 — 예전에는 표에서 못 찾으면 undefined 컴포넌트를 렌더링해 앱 전체가 멈췄다.
 */
const TYPE_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  INVENTORY: { icon: AlertTriangle, className: RED },
  PRODUCTION: { icon: Factory, className: RED },
  PRODUCTION_DELAY: { icon: Factory, className: RED },
  LEAVE: { icon: CalendarClock, className: WARNING },
  LEAVE_REQUESTED: { icon: CalendarClock, className: WARNING },
  LEAVE_APPROVED: { icon: CalendarClock, className: INFO },
  LEAVE_REJECTED: { icon: CalendarClock, className: RED },
  PAYROLL: { icon: Wallet, className: INFO },
  SCHEDULE: { icon: CalendarDays, className: PRIMARY },
  PURCHASE_DRAFT: { icon: ClipboardList, className: INFO },
  ATTENDANCE_ANOMALY: { icon: UserX, className: WARNING },
  SALES_DROP: { icon: TrendingDown, className: RED },
  MONTHLY_REPORT: { icon: FileText, className: PRIMARY },
  FAQ_CANDIDATES: { icon: MessagesSquare, className: PRIMARY },
};

function styleOf(type: string): { icon: LucideIcon; className: string } {
  return TYPE_STYLE[type] ?? { icon: Bell, className: NEUTRAL };
}

function formatRelativeDate(iso: string) {
  const now = new Date();
  const date = new Date(iso);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return `오늘 ${iso.slice(11, 16)}`;
  if (diffDays === 1) return '1일 전';
  return `${diffDays}일 전`;
}

function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const list = notifications ?? [];
  const unreadCount = list.filter((n) => !n.isRead).length;

  const handleClick = (notification: AppNotification) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="알림"
          className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground">알림</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              모두 읽음
            </Button>
          )}
        </div>
        <div className="flex max-h-80 flex-col overflow-y-auto">
          {list.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">알림이 없습니다.</p>
          ) : (
            list.map((notification) => {
              const { icon: Icon, className: iconClass } = styleOf(notification.type);
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleClick(notification)}
                  className={cn(
                    'flex items-start gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-gray-50',
                    !notification.isRead && 'bg-primary-soft/30',
                  )}
                >
                  <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', iconClass)}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">{notification.title}</span>
                      {!notification.isRead && <span className="size-1.5 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{notification.message}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{formatRelativeDate(notification.createdAt)}</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { NotificationsPopover };
