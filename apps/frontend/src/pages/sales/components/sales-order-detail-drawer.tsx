import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateSalesOrderStatus } from '@/pages/sales/hooks/use-sales-orders';
import { STATUS_LABEL } from '@/pages/sales/status-labels';
import type { SalesOrder, SalesOrderStatus } from '@/pages/sales/api/sales-orders-api';

interface SalesOrderDetailDrawerProps {
  order: SalesOrder | null;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: SalesOrderStatus[] = ['QUOTE', 'CONFIRMED', 'SHIPPED', 'INVOICED', 'CANCELLED'];

function SalesOrderDetailDrawer({ order, onOpenChange }: SalesOrderDetailDrawerProps) {
  const updateStatus = useUpdateSalesOrderStatus();
  if (!order) return null;

  return (
    <Sheet open={Boolean(order)} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-full">
        <SheetHeader>
          <SheetTitle>{order.orderNo}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {order.partnerName} · {order.orderDate.slice(0, 10)}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">주문 상태</span>
            <Select
              value={order.status}
              onValueChange={(status) => updateStatus.mutate({ id: order.id, status: status as SalesOrderStatus })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2">제품</th>
                <th className="py-2 text-right">수량</th>
                <th className="py-2 text-right">단가</th>
                <th className="py-2 text-right">금액</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-2">{item.productName}</td>
                  <td className="py-2 text-right tabular-nums">
                    {item.quantity}
                    {item.unit}
                  </td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">₩{item.unitPrice.toLocaleString()}</td>
                  <td className="py-2 text-right tabular-nums font-medium">₩{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-2 flex justify-end border-t border-border pt-2 text-sm font-semibold text-foreground">
            합계: ₩{order.totalAmount.toLocaleString()}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { SalesOrderDetailDrawer };
