import { Badge } from '@/components/ui/badge';
import { STATUS_BADGE_VARIANT, STATUS_LABEL } from '@/pages/sales/status-labels';
import type { SalesOrder } from '@/pages/sales/api/sales-orders-api';

interface SalesOrderTableProps {
  orders: SalesOrder[];
  onRowClick: (order: SalesOrder) => void;
}

function SalesOrderTable({ orders, onRowClick }: SalesOrderTableProps) {
  if (orders.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">등록된 영업 주문이 없습니다.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
          <th className="px-4 py-2.5">주문번호</th>
          <th className="px-4 py-2.5">거래처</th>
          <th className="px-4 py-2.5">주문일</th>
          <th className="px-4 py-2.5 text-right">금액</th>
          <th className="px-4 py-2.5">상태</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr
            key={order.id}
            onClick={() => onRowClick(order)}
            className="cursor-pointer border-b border-border last:border-0 hover:bg-gray-50"
          >
            <td className="px-4 py-2.5 font-medium text-foreground">{order.orderNo}</td>
            <td className="px-4 py-2.5 text-muted-foreground">{order.partnerName}</td>
            <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{order.orderDate.slice(0, 10)}</td>
            <td className="px-4 py-2.5 text-right tabular-nums font-medium text-foreground">₩{order.totalAmount.toLocaleString()}</td>
            <td className="px-4 py-2.5">
              <Badge variant={STATUS_BADGE_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export { SalesOrderTable };
