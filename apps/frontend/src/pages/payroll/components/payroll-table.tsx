import { PayrollStatusBadge } from '@/pages/payroll/components/payroll-status-badge';
import type { PayrollRecord } from '@/pages/payroll/api/payroll-api';

function sum(values: Record<string, number>) {
  return Object.values(values).reduce((a, b) => a + b, 0);
}

interface PayrollTableProps {
  records: PayrollRecord[];
  onRowClick: (record: PayrollRecord) => void;
}

function PayrollTable({ records, onRowClick }: PayrollTableProps) {
  if (records.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">해당 월의 급여 데이터가 없습니다.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5">사번/이름</th>
          <th className="px-4 py-2.5">부서</th>
          <th className="px-4 py-2.5 text-right">기본급</th>
          <th className="px-4 py-2.5 text-right">수당</th>
          <th className="px-4 py-2.5 text-right">공제</th>
          <th className="px-4 py-2.5 text-right">실지급액</th>
          <th className="px-4 py-2.5">상태</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr
            key={record.id}
            className="cursor-pointer border-b border-border last:border-0 hover:bg-gray-50"
            onClick={() => onRowClick(record)}
          >
            <td className="px-4 py-2.5">
              <span className="font-medium text-foreground">{record.user?.employeeNo}</span>{' '}
              <span className="text-muted-foreground">{record.user?.name}</span>
            </td>
            <td className="px-4 py-2.5 text-muted-foreground">{record.user?.department?.name ?? '-'}</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{record.baseSalary.toLocaleString()}</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{sum(record.allowances).toLocaleString()}</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{sum(record.deductions).toLocaleString()}</td>
            <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-foreground">{record.netSalary.toLocaleString()}</td>
            <td className="px-4 py-2.5">
              <PayrollStatusBadge status={record.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { PayrollTable };
