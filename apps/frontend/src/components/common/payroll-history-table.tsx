import { UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { PAYROLL_SEED, type PayrollStatus } from '@/mocks/payroll';

const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = { DRAFT: 'DRAFT', CONFIRMED: 'CONFIRMED', PAID: 'PAID' };

function PayrollHistoryTable({ employeeId }: { employeeId: string }) {
  const payrolls = PAYROLL_SEED.filter((p) => p.employeeId === employeeId).sort((a, b) => b.payMonth - a.payMonth);

  if (payrolls.length === 0) {
    return <EmptyState icon={UserX} title="급여 이력이 없습니다" />;
  }

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
        {payrolls.map((p) => (
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
