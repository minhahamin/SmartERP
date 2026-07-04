import { Pin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/config/routes';
import type { RecentAnnouncement } from '@/pages/dashboard/api/get-dashboard-summary';

function RecentAnnouncements({ announcements }: { announcements: RecentAnnouncement[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>최근 공지사항</CardTitle>
        <Link to={ROUTES.announcements} className="text-xs font-medium text-primary hover:underline">
          전체보기 →
        </Link>
      </CardHeader>
      <div className="flex flex-col divide-y divide-border px-5 pb-2">
        {announcements.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">공지사항이 없습니다.</p>
        ) : (
          announcements.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              {item.pinned ? (
                <Pin className="size-3.5 shrink-0 fill-primary text-primary" />
              ) : (
                <span className="size-3.5 shrink-0" />
              )}
              <Tag className="shrink-0">{item.scope}</Tag>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{item.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.publishedAt.slice(5)}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function RecentAnnouncementsSkeleton() {
  return <Skeleton className="h-40 rounded-md" />;
}

export { RecentAnnouncements, RecentAnnouncementsSkeleton };
