import { useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubmitLeaveRequest } from '@/pages/profile/hooks/use-leave';
import { FIXED_FRACTION_LEAVE_TYPES, HOURLY_TIME_SLOTS, LEAVE_TYPE_LABEL, type LeaveType } from '@/pages/profile/api/leave-api';

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}

const FIXED_FRACTION_NOTE: Partial<Record<LeaveType, string>> = {
  HALF_DAY_AM: '오전반차는 하루 중 0.5일이 차감됩니다(09:00~14:00).',
  HALF_DAY_PM: '오후반차는 하루 중 0.5일이 차감됩니다(14:00~18:00).',
  HOURLY: '시간반차는 선택한 2시간 구간만큼 0.25일이 차감됩니다.',
};

const EMPTY_FORM = { type: 'ANNUAL' as LeaveType, startDate: '', endDate: '', timeSlot: '', reason: '' };

function LeaveRequestDialog({ open, onOpenChange, employeeId }: LeaveRequestDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const submitLeaveRequest = useSubmitLeaveRequest();
  const isFixedFraction = FIXED_FRACTION_LEAVE_TYPES.includes(form.type);
  const isHourly = form.type === 'HOURLY';

  const handleTypeChange = (value: string) => {
    const type = value as LeaveType;
    const isFixed = FIXED_FRACTION_LEAVE_TYPES.includes(type);
    setForm({
      ...form,
      type,
      endDate: isFixed ? form.startDate : form.endDate,
      timeSlot: type === 'HOURLY' ? HOURLY_TIME_SLOTS[0] : '',
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitLeaveRequest.mutate(
      {
        employeeId,
        ...form,
        endDate: isFixedFraction ? form.startDate : form.endDate,
        timeSlot: isHourly ? form.timeSlot : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setForm(EMPTY_FORM);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>연차 신청</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label>유형</Label>
              <Select value={form.type} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isFixedFraction ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="leave-start">휴가일</Label>
                  <Input
                    id="leave-start"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                  />
                </div>
                {isHourly && (
                  <div className="flex flex-col gap-1.5">
                    <Label>시간 구간</Label>
                    <Select value={form.timeSlot} onValueChange={(value) => setForm({ ...form, timeSlot: value })}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURLY_TIME_SLOTS.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{FIXED_FRACTION_NOTE[form.type]}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="leave-start">시작일</Label>
                  <Input
                    id="leave-start"
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate || e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="leave-end">종료일</Label>
                  <Input
                    id="leave-end"
                    type="date"
                    required
                    min={form.startDate || undefined}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="leave-reason">사유</Label>
              <Textarea id="leave-reason" required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={submitLeaveRequest.isPending}>
              신청
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { LeaveRequestDialog };
