import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ProductionOrder, ProductionStatus } from '@/pages/production/api/production-api';

const STATUS_OPTIONS: { value: ProductionStatus; label: string }[] = [
  { value: 'PLANNED', label: '계획' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'DELAYED', label: '지연' },
  { value: 'COMPLETED', label: '완료' },
];

function dDay(dueDate: string) {
  const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-Day';
  return diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
}

interface ProductionOrderCardProps {
  order: ProductionOrder;
  onStatusChange: (status: ProductionStatus) => void;
}

function ProductionOrderCard({ order, onStatusChange }: ProductionOrderCardProps) {
  const isDelayed = order.status === 'DELAYED';

  return (
    <Card className={cn('p-3', isDelayed && 'border-red-300 bg-red-50/40')}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{order.orderNo}</span>
        <Badge variant={isDelayed ? 'danger' : order.status === 'COMPLETED' ? 'success' : 'default'}>{dDay(order.dueDate)}</Badge>
      </div>
      <p className="mt-1.5 text-sm font-medium text-foreground">{order.productName}</p>
      <p className="text-xs text-muted-foreground">{order.lineName} · {order.producedQty}/{order.plannedQty}{order.unit}</p>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">마감 {order.dueDate.slice(0, 10)}</p>
      <Select value={order.status} onValueChange={(value) => onStatusChange(value as ProductionStatus)}>
        <SelectTrigger size="sm" className="mt-2.5 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Card>
  );
}

export { ProductionOrderCard };
