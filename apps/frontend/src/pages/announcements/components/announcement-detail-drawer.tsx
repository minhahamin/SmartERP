import { useEffect } from 'react';
import { Pencil, Pin, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { getEmployeeById } from '@/mocks/employees';
import { useMarkAnnouncementRead } from '@/pages/announcements/hooks/use-announcements';
import type { Announcement } from '@/mocks/announcements';

interface AnnouncementDetailDrawerProps {
  announcement: Announcement | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (announcement: Announcement) => void;
}

function AnnouncementDetailDrawer({ announcement, onOpenChange, onEdit }: AnnouncementDetailDrawerProps) {
  const markRead = useMarkAnnouncementRead();

  useEffect(() => {
    if (announcement) markRead.mutate(announcement.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement?.id]);

  if (!announcement) return null;

  return (
    <Sheet open={Boolean(announcement)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-full">
        <SheetHeader className="flex-row items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {announcement.isPinned && <Pin className="size-4 fill-primary text-primary" />}
              <Tag>{announcement.scope}</Tag>
            </div>
            <SheetTitle className="mt-1">{announcement.title}</SheetTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {getEmployeeById(announcement.authorId)?.name} · {announcement.publishedAt}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onEdit(announcement)}>
            <Pencil /> 수정
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{announcement.content}</p>
        </div>
        <div className="flex items-center gap-1.5 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          읽음 {announcement.readCount}/{announcement.totalTargetCount}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { AnnouncementDetailDrawer };
