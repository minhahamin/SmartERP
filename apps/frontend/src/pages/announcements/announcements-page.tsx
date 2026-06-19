import { useState } from 'react';
import { Pin, Plus, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Skeleton } from '@/components/ui/skeleton';
import { AnnouncementFormDialog } from '@/pages/announcements/components/announcement-form-dialog';
import { AnnouncementDetailDrawer } from '@/pages/announcements/components/announcement-detail-drawer';
import { useAnnouncements } from '@/pages/announcements/hooks/use-announcements';
import { getEmployeeById } from '@/mocks/employees';
import type { Announcement } from '@/mocks/announcements';

function AnnouncementsPage() {
  const { data: announcements, isLoading } = useAnnouncements();
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Announcement | null>(null);

  const pinned = announcements?.filter((a) => a.isPinned) ?? [];
  const others = announcements?.filter((a) => !a.isPinned) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="공지사항"
        description="전사/부서 공지를 작성하고 읽음 현황을 확인합니다."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> 공지 작성
          </Button>
        }
      />

      {isLoading || !announcements ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pinned.length > 0 && (
            <Card className="overflow-hidden p-0">
              {pinned.map((a) => (
                <AnnouncementRow key={a.id} announcement={a} onClick={() => setSelected(a)} />
              ))}
            </Card>
          )}
          <Card className="overflow-hidden p-0">
            {others.map((a) => (
              <AnnouncementRow key={a.id} announcement={a} onClick={() => setSelected(a)} />
            ))}
          </Card>
        </div>
      )}

      <AnnouncementFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <AnnouncementDetailDrawer announcement={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}

function AnnouncementRow({ announcement, onClick }: { announcement: Announcement; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-gray-50"
    >
      {announcement.isPinned ? <Pin className="size-3.5 shrink-0 fill-primary text-primary" /> : <span className="size-3.5 shrink-0" />}
      <Tag className="shrink-0">{announcement.scope}</Tag>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{announcement.title}</span>
      <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
        <Users className="size-3 shrink-0" />
        {announcement.readCount}/{announcement.totalTargetCount}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{getEmployeeById(announcement.authorId)?.name}</span>
      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{announcement.publishedAt.slice(5)}</span>
    </button>
  );
}

export { AnnouncementsPage };
