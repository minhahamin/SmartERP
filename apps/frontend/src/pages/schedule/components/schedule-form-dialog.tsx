import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateSchedule, useUpdateSchedule } from '@/pages/schedule/hooks/use-schedule';
import { useAuthStore } from '@/stores/auth-store';
import { SCHEDULE_TYPE_LABEL, type ScheduleEvent, type ScheduleType, type ScheduleVisibility } from '@/mocks/schedules';

interface ScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate: string;
  event?: ScheduleEvent;
}

const VISIBILITY_LABEL: Record<ScheduleVisibility, string> = {
  PRIVATE: '나만 보기',
  DEPARTMENT: '부서 공개',
  COMPANY: '전사 공개',
};

const EMPTY_FORM = {
  title: '',
  type: 'MEETING' as ScheduleType,
  date: '',
  startTime: '10:00',
  endTime: '11:00',
  location: '',
  visibility: 'DEPARTMENT' as ScheduleVisibility,
};

function ScheduleFormDialog({ open, onOpenChange, defaultDate, event }: ScheduleFormDialogProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM, date: defaultDate });
  const user = useAuthStore((state) => state.user);
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const isEdit = Boolean(event);
  const isSubmitting = createSchedule.isPending || updateSchedule.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        event
          ? {
              title: event.title,
              type: event.type,
              date: event.date,
              startTime: event.startTime,
              endTime: event.endTime,
              location: event.location,
              visibility: event.visibility,
            }
          : { ...EMPTY_FORM, date: defaultDate },
      );
    }
  }, [open, event, defaultDate]);

  const handleSubmit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (isEdit && event) {
      updateSchedule.mutate({ id: event.id, input: form }, { onSuccess: () => onOpenChange(false) });
      return;
    }
    if (!user) return;
    createSchedule.mutate(
      { ...form, ownerId: user.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm({ ...EMPTY_FORM, date: defaultDate });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? '일정 수정' : '일정 추가'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sch-title">제목</Label>
              <Input id="sch-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>유형</Label>
                <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as ScheduleType })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCHEDULE_TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>공개범위</Label>
                <Select value={form.visibility} onValueChange={(value) => setForm({ ...form, visibility: value as ScheduleVisibility })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(VISIBILITY_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="sch-date">날짜</Label>
                <Input id="sch-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sch-start">시작 시간</Label>
                <Input id="sch-start" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sch-end">종료 시간</Label>
                <Input id="sch-end" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="sch-location">장소</Label>
                <Input id="sch-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? '저장' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ScheduleFormDialog };
