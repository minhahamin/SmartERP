import { UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayrollHistory } from '@/pages/payroll/hooks/use-payroll';
import type { PayrollStatus } from '@/pages/payroll/api/payroll-api';

const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = { DRAFT: 'DRAFT', CONFIRMED: 'CONFIRMED', PAID: 'PAID' };

function PayrollHistoryTable({ employeeId }: { employeeId: string }) {
  const { data: payrolls, isLoading } = usePayrollHistory(employeeId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }

  if (!payrolls || payrolls.length === 0) {
    return <EmptyState icon={UserX} title="급여 이력이 없습니다" />;
  }

  const sorted = [...payrolls].sort((a, b) => b.payYear * 12 + b.payMonth - (a.payYear * 12 + a.payMonth));

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-muted-foreground">
          <th className="py-2">귀속월</th>
          <th className="py-2 text-right">기본급</th>
          <th className="py-2 text-right">실지급액</th>
          <th className="py-2">상태</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((p) => (
          <tr key={p.id} className="border-b border-border last:border-0">
            <td className="py-2 tabular-nums">
              {p.payYear}년 {p.payMonth}월
            </td>
            <td className="py-2 text-right tabular-nums text-muted-foreground">{p.baseSalary.toLocaleString()}</td>
            <td className="py-2 text-right tabular-nums font-medium text-foreground">{p.netSalary.toLocaleString()}</td>
            <td className="py-2">
              <Badge variant={p.status === 'PAID' ? 'success' : p.status === 'CONFIRMED' ? 'info' : 'default'}>
                {PAYROLL_STATUS_LABEL[p.status]}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { PayrollHistoryTable };
