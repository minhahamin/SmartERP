import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ProductionOrderCard } from '@/pages/production/components/production-order-card';
import { ProductionFormDialog } from '@/pages/production/components/production-form-dialog';
import { useProductionOrders, useUpdateProductionStatus } from '@/pages/production/hooks/use-production';
import type { ProductionOrder, ProductionStatus } from '@/mocks/production-orders';

const COLUMNS: { status: ProductionStatus; label: string }[] = [
  { status: 'PLANNED', label: '계획' },
  { status: 'IN_PROGRESS', label: '진행중' },
  { status: 'DELAYED', label: '지연' },
  { status: 'COMPLETED', label: '완료' },
];

function ProductionPage() {
  const { data: orders, isLoading } = useProductionOrders();
  const updateStatus = useUpdateProductionStatus();
  const [formOpen, setFormOpen] = useState(false);
  const [completingOrder, setCompletingOrder] = useState<ProductionOrder | null>(null);

  const handleStatusChange = (order: ProductionOrder, status: ProductionStatus) => {
    if (status === 'COMPLETED') {
      setCompletingOrder(order);
      return;
    }
    updateStatus.mutate({ id: order.id, status });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="생산 관리"
        description="생산 오더 진행 상태를 추적합니다."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> 생산 오더 등록
          </Button>
        }
      />

      {isLoading || !orders ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {COLUMNS.map((column) => {
            const columnOrders = orders.filter((o) => o.status === column.status);
            return (
              <div key={column.status} className="flex flex-col gap-2 rounded-md bg-gray-50 p-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-foreground">{column.label}</span>
                  <span className="text-xs text-muted-foreground">{columnOrders.length}건</span>
                </div>
                <div className="flex flex-col gap-2">
                  {columnOrders.map((order) => (
                    <ProductionOrderCard key={order.id} order={order} onStatusChange={(status) => handleStatusChange(order, status)} />
                  ))}
                  {columnOrders.length === 0 && <p className="px-1 py-6 text-center text-xs text-muted-foreground">오더 없음</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ProductionFormDialog open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={Boolean(completingOrder)}
        onOpenChange={(open) => !open && setCompletingOrder(null)}
        title="생산을 완료 처리할까요?"
        description="완료 처리 시 계획 수량만큼 재고에 자동으로 입고됩니다."
        confirmLabel="완료 처리"
        loading={updateStatus.isPending}
        onConfirm={() => {
          if (!completingOrder) return;
          updateStatus.mutate({ id: completingOrder.id, status: 'COMPLETED' }, { onSuccess: () => setCompletingOrder(null) });
        }}
      />
    </div>
  );
}

export { ProductionPage };
