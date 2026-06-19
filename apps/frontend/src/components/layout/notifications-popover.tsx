import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarClock, CalendarDays, Factory, Wallet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotificationsStore } from '@/stores/notifications-store';
import type { AppNotification, NotificationType } from '@/mocks/notifications';

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  INVENTORY: AlertTriangle,
  PRODUCTION: Factory,
  LEAVE: CalendarClock,
  PAYROLL: Wallet,
  SCHEDULE: CalendarDays,
};

const TYPE_ICON_CLASS: Record<NotificationType, string> = {
  INVENTORY: 'bg-red-100 text-red-600',
  PRODUCTION: 'bg-red-100 text-red-600',
  LEAVE: 'bg-warning-soft text-warning-foreground',
  PAYROLL: 'bg-info-soft text-info-foreground',
  SCHEDULE: 'bg-primary-soft text-primary-soft-foreground',
};

function formatRelativeDate(iso: string) {
  const today = new Date('2026-06-19T23:59:59');
  const date = new Date(iso);
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return `오늘 ${iso.slice(11, 16)}`;
  if (diffDays === 1) return '1일 전';
  return `${diffDays}일 전`;
}

function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead } = useNotificationsStore();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleClick = (notification: AppNotification) => {
    markAsRead(notification.id);
    setOpen(false);
    navigate(notification.link);
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
            <Button variant="ghost" size="sm" className="h-auto px-1.5 py-0.5 text-xs" onClick={() => markAllAsRead()}>
              모두 읽음
            </Button>
          )}
        </div>
        <div className="flex max-h-80 flex-col overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">알림이 없습니다.</p>
          ) : (
            notifications.map((notification) => {
              const Icon = TYPE_ICON[notification.type];
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
                  <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', TYPE_ICON_CLASS[notification.type])}>
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
