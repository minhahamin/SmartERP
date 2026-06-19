import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarGrid } from '@/pages/schedule/components/calendar-grid';
import { ScheduleFormDialog } from '@/pages/schedule/components/schedule-form-dialog';
import { useSchedulesByMonth } from '@/pages/schedule/hooks/use-schedule';

const LEGEND: { label: string; className: string }[] = [
  { label: '회의', className: 'bg-info' },
  { label: '휴가', className: 'bg-primary' },
  { label: '출장', className: 'bg-warning' },
  { label: '기타', className: 'bg-gray-400' },
];

function SchedulePage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6);
  const [formOpen, setFormOpen] = useState(false);
  const { data: events, isLoading } = useSchedulesByMonth(year, month);

  const goToMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="일정 관리" description="개인/부서/전사 일정을 캘린더로 공유합니다." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => goToMonth(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="w-32 text-center text-sm font-semibold text-foreground">
            {year}년 {month}월
          </span>
          <Button variant="ghost" size="icon" onClick={() => goToMonth(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setYear(2026);
              setMonth(6);
            }}
          >
            오늘
          </Button>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> 일정 추가
        </Button>
      </div>

      <Card className="p-4">
        {isLoading || !events ? <Skeleton className="h-[520px]" /> : <CalendarGrid year={year} month={month} events={events} />}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </Card>

      <ScheduleFormDialog open={formOpen} onOpenChange={setFormOpen} defaultDate={`${year}-${String(month).padStart(2, '0')}-01`} />
    </div>
  );
}

export { SchedulePage };
