import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { CalendarGrid } from '@/pages/schedule/components/calendar-grid';
import { ScheduleFormDialog } from '@/pages/schedule/components/schedule-form-dialog';
import { useDeleteSchedule, useSchedulesByMonth } from '@/pages/schedule/hooks/use-schedule';
import type { ScheduleEvent } from '@/pages/schedule/api/schedule-api';

const LEGEND: { label: string; className: string }[] = [
  { label: '회의', className: 'bg-info' },
  { label: '휴가', className: 'bg-primary' },
  { label: '출장', className: 'bg-warning' },
  { label: '기타', className: 'bg-gray-400' },
];

const now = new Date();

function SchedulePage() {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduleEvent | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEvent | null>(null);
  const { data: events, isLoading } = useSchedulesByMonth(year, month);
  const deleteSchedule = useDeleteSchedule();

  const goToMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  const openCreateForm = () => {
    setEditingEvent(undefined);
    setFormOpen(true);
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
              setYear(now.getFullYear());
              setMonth(now.getMonth() + 1);
            }}
          >
            오늘
          </Button>
        </div>
        <Button onClick={openCreateForm}>
          <Plus /> 일정 추가
        </Button>
      </div>

      <Card className="p-4">
        {isLoading || !events ? (
          <Skeleton className="h-[520px]" />
        ) : (
          <CalendarGrid
            year={year}
            month={month}
            events={events}
            onEdit={(event) => {
              setEditingEvent(event);
              setFormOpen(true);
            }}
            onDelete={setDeleteTarget}
          />
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>
      </Card>

      <ScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDate={`${year}-${String(month).padStart(2, '0')}-01`}
        event={editingEvent}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`'${deleteTarget?.title}' 일정을 삭제할까요?`}
        confirmLabel="삭제"
        variant="danger"
        loading={deleteSchedule.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteSchedule.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </div>
  );
}

export { SchedulePage };
