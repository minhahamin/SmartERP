import { Badge } from '@/components/ui/badge';
import { useEmployees } from '@/pages/employees/hooks/use-employees';
import type { StockMovement } from '@/pages/stock-movements/api/stock-movements-api';

const TYPE_LABEL: Record<StockMovement['type'], string> = { IN: '입고', OUT: '출고', ADJUST: '조정', TRANSFER: '이동' };
const REF_LABEL: Record<StockMovement['refType'], string> = { PURCHASE: '구매', SALES: '판매', PRODUCTION: '생산', RETURN: '반품', ADJUSTMENT: '조정' };

function StockMovementTable({ movements }: { movements: StockMovement[] }) {
  const { data: employees } = useEmployees({ status: 'ACTIVE', page: 1, limit: 100 });
  const employeeName = (id: string) => employees?.items.find((e) => e.id === id)?.name ?? id;

  if (movements.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">조건에 맞는 입출고 이력이 없습니다.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5">일시</th>
          <th className="px-4 py-2.5">제품</th>
          <th className="px-4 py-2.5">창고</th>
          <th className="px-4 py-2.5">유형</th>
          <th className="px-4 py-2.5 text-right">수량</th>
          <th className="px-4 py-2.5">사유</th>
          <th className="px-4 py-2.5">처리자</th>
        </tr>
      </thead>
      <tbody>
        {movements.map((m) => {
          const isOut = m.type === 'OUT' || (m.type === 'ADJUST' && m.quantity < 0);
          return (
            <tr key={m.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{m.createdAt.slice(0, 16).replace('T', ' ')}</td>
              <td className="px-4 py-2.5 font-medium text-foreground">{m.productName}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{m.warehouseName}</td>
              <td className="px-4 py-2.5">
                <Badge variant={m.type === 'IN' ? 'success' : m.type === 'OUT' ? 'danger' : 'default'}>{TYPE_LABEL[m.type]}</Badge>
              </td>
              <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${isOut ? 'text-red-600' : 'text-success-foreground'}`}>
                {isOut ? '' : '+'}{m.quantity}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{REF_LABEL[m.refType]} · {m.memo}</td>
              <td className="px-4 py-2.5 text-muted-foreground">{employeeName(m.createdBy)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export { StockMovementTable };
