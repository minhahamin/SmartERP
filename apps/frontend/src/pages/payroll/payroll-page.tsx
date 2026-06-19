import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayrollTable } from '@/pages/payroll/components/payroll-table';
import { PayrollDetailSheet } from '@/pages/payroll/components/payroll-detail-sheet';
import { PayrollStatusBadge } from '@/pages/payroll/components/payroll-status-badge';
import {
  useBulkConfirmPayroll,
  useGenerateMonthlyPayroll,
  useMyPayroll,
  usePayrollList,
} from '@/pages/payroll/hooks/use-payroll';
import { useAuthStore } from '@/stores/auth-store';
import { Wallet } from 'lucide-react';
import type { PayrollRecord } from '@/mocks/payroll';

const MONTH_OPTIONS = [
  { year: 2026, month: 4, label: '2026년 04월' },
  { year: 2026, month: 5, label: '2026년 05월' },
  { year: 2026, month: 6, label: '2026년 06월' },
  { year: 2026, month: 7, label: '2026년 07월' },
];

function PayrollPage() {
  const role = useAuthStore((state) => state.user?.role);
  if (role === 'EMPLOYEE') return <MyPayrollView />;
  return <PayrollManagementView />;
}

function PayrollManagementView() {
  const [monthIndex, setMonthIndex] = useState(2); // 2026-06
  const { year, month } = MONTH_OPTIONS[monthIndex];
  const { data: records, isLoading } = usePayrollList(year, month);
  const generate = useGenerateMonthlyPayroll();
  const bulkConfirm = useBulkConfirmPayroll();
  const [selected, setSelected] = useState<PayrollRecord | null>(null);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);

  const summary = useMemo(() => {
    const draft = records?.filter((r) => r.status === 'DRAFT').length ?? 0;
    const confirmed = records?.filter((r) => r.status === 'CONFIRMED').length ?? 0;
    const paid = records?.filter((r) => r.status === 'PAID').length ?? 0;
    return { draft, confirmed, paid };
  }, [records]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="급여 관리" description="월별 급여를 산정, 확정, 지급 처리합니다." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={String(monthIndex)} onValueChange={(value) => setMonthIndex(Number(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((option, index) => (
                <SelectItem key={option.label} value={String(index)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {records && records.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="default">DRAFT {summary.draft}건</Badge>
              <Badge variant="info">CONFIRMED {summary.confirmed}건</Badge>
              <Badge variant="success">PAID {summary.paid}건</Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {records && records.length > 0 && summary.draft > 0 && (
            <Button variant="secondary" onClick={() => setBulkConfirmOpen(true)}>
              일괄 확정
            </Button>
          )}
          {(!records || records.length === 0) && !isLoading && (
            <Button onClick={() => generate.mutate({ year, month })} loading={generate.isPending}>
              급여 일괄 생성
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !records || records.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="해당 월의 급여 데이터가 없습니다"
            description="'급여 일괄 생성' 버튼을 눌러 직원별 기본급 기준 급여를 생성하세요."
          />
        ) : (
          <PayrollTable records={records} onRowClick={setSelected} />
        )}
      </Card>

      <PayrollDetailSheet record={selected} onOpenChange={(open) => !open && setSelected(null)} />

      <ConfirmDialog
        open={bulkConfirmOpen}
        onOpenChange={setBulkConfirmOpen}
        title={`${year}년 ${month}월 급여를 일괄 확정할까요?`}
        description="DRAFT 상태인 급여 항목이 모두 CONFIRMED로 전환됩니다."
        confirmLabel="일괄 확정"
        loading={bulkConfirm.isPending}
        onConfirm={() => bulkConfirm.mutate({ year, month }, { onSuccess: () => setBulkConfirmOpen(false) })}
      />
    </div>
  );
}

function MyPayrollView() {
  const user = useAuthStore((state) => state.user);
  const { data: records, isLoading } = useMyPayroll(user?.id);
  const [selected, setSelected] = useState<PayrollRecord | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="급여 관리" description="본인의 급여 내역을 확인합니다." />

      <Card className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : !records || records.length === 0 ? (
          <EmptyState icon={Wallet} title="급여 이력이 없습니다" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
                <th className="px-4 py-2.5">귀속월</th>
                <th className="px-4 py-2.5 text-right">실지급액</th>
                <th className="px-4 py-2.5">상태</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="cursor-pointer border-b border-border last:border-0 hover:bg-gray-50" onClick={() => setSelected(r)}>
                  <td className="px-4 py-2.5">{r.payYear}년 {r.payMonth}월</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{r.netSalary.toLocaleString()}원</td>
                  <td className="px-4 py-2.5">
                    <PayrollStatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <PayrollDetailSheet record={selected} onOpenChange={(open) => !open && setSelected(null)} readOnly />
    </div>
  );
}

export { PayrollPage };
