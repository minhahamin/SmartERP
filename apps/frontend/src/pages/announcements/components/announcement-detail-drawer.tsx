import { useEffect } from 'react';
import { Pencil, Pin, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { useEmployees, useRoleOptions } from '@/pages/employees/hooks/use-employees';
import { useMarkAnnouncementRead } from '@/pages/announcements/hooks/use-announcements';
import { roleLabel } from '@/types/auth';
import type { Announcement } from '@/pages/announcements/api/announcements-api';

interface AnnouncementDetailDrawerProps {
  announcement: Announcement | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (announcement: Announcement) => void;
}

function AnnouncementDetailDrawer({ announcement, onOpenChange, onEdit }: AnnouncementDetailDrawerProps) {
  const markRead = useMarkAnnouncementRead();
  const { data: employees } = useEmployees({ status: 'ACTIVE', page: 1, limit: 100 });
  const { data: roles } = useRoleOptions();

  useEffect(() => {
    if (announcement) markRead.mutate(announcement.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcement?.id]);

  if (!announcement) return null;

  const authorName = employees?.items.find((e) => e.id === announcement.authorId)?.name ?? '-';
  const scopeLabel = announcement.targetRoleId
    ? roleLabel(roles?.find((r) => r.id === announcement.targetRoleId)?.name ?? announcement.targetRoleId)
    : '전사';

  return (
    <Sheet open={Boolean(announcement)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-full">
        <SheetHeader className="flex-row items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              {announcement.isPinned && <Pin className="size-4 fill-primary text-primary" />}
              <Tag>{scopeLabel}</Tag>
            </div>
            <SheetTitle className="mt-1">{announcement.title}</SheetTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {authorName} · {announcement.publishedAt.slice(0, 10)}
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
