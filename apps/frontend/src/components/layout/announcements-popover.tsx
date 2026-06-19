import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Pin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tag } from '@/components/ui/tag';
import { useAnnouncements, useMarkAnnouncementRead } from '@/pages/announcements/hooks/use-announcements';
import { ROUTES } from '@/config/routes';
import { cn } from '@/lib/utils';
import type { AnnouncementWithReadState } from '@/pages/announcements/api/announcements-api';

function AnnouncementsPopover() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: announcements } = useAnnouncements();
  const markRead = useMarkAnnouncementRead();
  const unreadCount = announcements?.filter((a) => !a.isReadByMe).length ?? 0;
  const preview = announcements?.slice(0, 4) ?? [];

  const handleClick = (announcement: AnnouncementWithReadState) => {
    markRead.mutate(announcement.id);
    setOpen(false);
    navigate(ROUTES.announcements);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="공지사항"
          className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Megaphone className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground">공지사항</span>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate(ROUTES.announcements);
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            전체보기
          </button>
        </div>
        <div className="flex max-h-80 flex-col overflow-y-auto">
          {preview.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">공지사항이 없습니다.</p>
          ) : (
            preview.map((announcement) => (
              <button
                key={announcement.id}
                type="button"
                onClick={() => handleClick(announcement)}
                className={cn(
                  'flex items-start gap-2 border-b border-border px-3 py-2.5 text-left last:border-0 hover:bg-gray-50',
                  !announcement.isReadByMe && 'bg-primary-soft/30',
                )}
              >
                {announcement.isPinned ? <Pin className="mt-0.5 size-3.5 shrink-0 fill-primary text-primary" /> : <span className="mt-0.5 size-3.5 shrink-0" />}
                <span className="flex-1">
                  <span className="flex items-center gap-1.5">
                    <Tag className="shrink-0">{announcement.scope}</Tag>
                    {!announcement.isReadByMe && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                  </span>
                  <span className="mt-1 block truncate text-sm font-medium text-foreground">{announcement.title}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{announcement.publishedAt}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { AnnouncementsPopover };
