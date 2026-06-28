import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useTransitionPayrollStatus, useUpdatePayrollItem } from '@/pages/payroll/hooks/use-payroll';
import type { PayrollRecord } from '@/pages/payroll/api/payroll-api';

interface PayrollDetailSheetProps {
  record: PayrollRecord | null;
  onOpenChange: (open: boolean) => void;
  readOnly?: boolean;
}

function sum(values: Record<string, number>) {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

function PayrollDetailSheet({ record, onOpenChange, readOnly = false }: PayrollDetailSheetProps) {
  const [allowances, setAllowances] = useState<Record<string, number>>({});
  const [deductions, setDeductions] = useState<Record<string, number>>({});
  const [transitionTarget, setTransitionTarget] = useState<'CONFIRMED' | 'PAID' | null>(null);
  const updateItem = useUpdatePayrollItem();
  const transition = useTransitionPayrollStatus();

  useEffect(() => {
    if (record) {
      setAllowances(record.allowances);
      setDeductions(record.deductions);
    }
  }, [record]);

  if (!record) return null;

  const netSalary = record.baseSalary + sum(allowances) - sum(deductions);
  const isDirty = JSON.stringify(allowances) !== JSON.stringify(record.allowances) || JSON.stringify(deductions) !== JSON.stringify(record.deductions);

  const handleSave = () => {
    updateItem.mutate({ id: record.id, allowances, deductions });
  };

  const removeKey = (set: typeof setAllowances, current: Record<string, number>, key: string) => {
    const next = { ...current };
    delete next[key];
    set(next);
  };

  const addEntry = (set: typeof setAllowances, current: Record<string, number>, label: string, value: number) => {
    if (!label.trim() || label in current) return;
    set({ ...current, [label.trim()]: value });
  };

  return (
    <>
      <Sheet open={Boolean(record)} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {record.user?.name ?? '내'} · {record.payYear}년 {record.payMonth}월 급여
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col gap-4 overflow-y-auto px-5">
            <Row label="기본급" value={record.baseSalary} readOnly />

            <Section
              title="수당"
              readOnly={readOnly}
              onAdd={(label, value) => addEntry(setAllowances, allowances, label, value)}
            >
              {Object.entries(allowances).map(([key, value]) => (
                <Row
                  key={key}
                  label={key}
                  value={value}
                  readOnly={readOnly}
                  onChange={(next) => setAllowances({ ...allowances, [key]: next })}
                  onRemove={readOnly ? undefined : () => removeKey(setAllowances, allowances, key)}
                />
              ))}
            </Section>

            <Section
              title="공제"
              readOnly={readOnly}
              onAdd={(label, value) => addEntry(setDeductions, deductions, label, value)}
            >
              {Object.entries(deductions).map(([key, value]) => (
                <Row
                  key={key}
                  label={key}
                  value={value}
                  readOnly={readOnly}
                  onChange={(next) => setDeductions({ ...deductions, [key]: next })}
                  onRemove={readOnly ? undefined : () => removeKey(setDeductions, deductions, key)}
                />
              ))}
            </Section>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-foreground">실지급액</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">{netSalary.toLocaleString()}원</span>
            </div>
          </div>

          {!readOnly && (
            <SheetFooter className="flex-row justify-end gap-2">
              <Button variant="secondary" disabled={!isDirty || updateItem.isPending} onClick={handleSave}>
                저장
              </Button>
              <Button variant="secondary" disabled={record.status !== 'DRAFT'} onClick={() => setTransitionTarget('CONFIRMED')}>
                확정하기
              </Button>
              <Button disabled={record.status !== 'CONFIRMED'} onClick={() => setTransitionTarget('PAID')}>
                지급하기
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={transitionTarget !== null}
        onOpenChange={(open) => !open && setTransitionTarget(null)}
        title={transitionTarget === 'PAID' ? '급여를 지급 처리할까요?' : '급여를 확정할까요?'}
        description={
          transitionTarget === 'PAID'
            ? '지급 처리 후에는 상태를 되돌릴 수 없습니다.'
            : '확정 후에는 수당/공제 항목을 수정할 수 없습니다.'
        }
        confirmLabel={transitionTarget === 'PAID' ? '지급' : '확정'}
        loading={transition.isPending}
        onConfirm={() => {
          if (!transitionTarget) return;
          transition.mutate({ id: record.id, status: transitionTarget }, { onSuccess: () => setTransitionTarget(null) });
        }}
      />
    </>
  );
}

function Section({
  title,
  children,
  readOnly,
  onAdd,
}: {
  title: string;
  children: ReactNode;
  readOnly?: boolean;
  onAdd?: (label: string, value: number) => void;
}) {
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (!onAdd || !newLabel.trim()) return;
    onAdd(newLabel, Number(newValue) || 0);
    setNewLabel('');
    setNewValue('');
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      {children}
      {!readOnly && onAdd && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="항목명"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-8"
          />
          <Input
            type="number"
            placeholder="금액"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="h-8 w-28 text-right tabular-nums"
          />
          <Button type="button" variant="secondary" size="sm" disabled={!newLabel.trim()} onClick={handleAdd}>
            추가
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  readOnly,
  onChange,
  onRemove,
}: {
  label: string;
  value: number;
  readOnly?: boolean;
  onChange?: (value: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {readOnly || !onChange ? (
        <span className="text-sm tabular-nums text-foreground">{value.toLocaleString()}</span>
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="w-32 text-right tabular-nums"
          />
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export { PayrollDetailSheet };
