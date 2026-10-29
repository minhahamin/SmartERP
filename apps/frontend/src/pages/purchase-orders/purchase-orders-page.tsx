import { useState } from 'react';
import { ClipboardList, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hasPermission } from '@/lib/permissions';
import { useAuthStore } from '@/stores/auth-store';
import { usePartners } from '@/pages/partners/hooks/use-partners';
import { useWarehouses } from '@/pages/inventory/hooks/use-warehouses';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/pages/purchase-orders/api/purchase-orders-api';
import {
  useCancelPurchaseOrder,
  useConfirmPurchaseOrder,
  useGenerateDrafts,
  usePurchaseOrders,
  useReceivePurchaseOrder,
  useUpdatePurchaseOrder,
} from '@/pages/purchase-orders/hooks/use-purchase-orders';
import { PurchaseOrderCard } from '@/pages/purchase-orders/components/purchase-order-card';

type StatusFilter = 'ALL' | PurchaseOrderStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'DRAFT', label: '초안' },
  { value: 'CONFIRMED', label: '확정' },
  { value: 'RECEIVED', label: '입고 완료' },
  { value: 'CANCELLED', label: '취소' },
];

type PendingAction = { kind: 'confirm' | 'cancel'; order: PurchaseOrder } | null;

function PurchaseOrdersPage() {
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [pending, setPending] = useState<PendingAction>(null);
  const canManage = useAuthStore((state) => hasPermission(state.user?.permissions, 'INVENTORY', 'UPDATE'));

  const { data: orders, isLoading } = usePurchaseOrders(filter === 'ALL' ? undefined : filter);
  const { data: vendors } = usePartners({ type: 'VENDOR' });
  const { data: bothPartners } = usePartners({ type: 'BOTH' });
  const { data: warehouses } = useWarehouses();

  const generate = useGenerateDrafts();
  const update = useUpdatePurchaseOrder();
  const confirm = useConfirmPurchaseOrder();
  const cancel = useCancelPurchaseOrder();
  const receive = useReceivePurchaseOrder();

  const suppliers = [...(vendors ?? []), ...(bothPartners ?? [])];

  function runPending() {
    if (!pending) return;
    const mutation = pending.kind === 'confirm' ? confirm : cancel;
    mutation.mutate(pending.order.id, { onSettled: () => setPending(null) });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="발주 관리"
        description="안전재고 미달 품목은 매일 아침 발주 초안으로 자동 생성됩니다. 공급처와 수량을 확인하고 확정해야 효력이 생깁니다."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {canManage && (
          <Button variant="secondary" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <Sparkles className="size-4" />
            {generate.isPending ? '확인 중…' : '지금 초안 생성'}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (orders ?? []).length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title="발주서가 없습니다" description="안전재고 미달 품목이 생기면 자동으로 초안이 만들어집니다." />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {(orders ?? []).map((order) => (
            <PurchaseOrderCard
              key={order.id}
              order={order}
              suppliers={suppliers}
              warehouses={warehouses ?? []}
              canManage={canManage}
              busy={update.isPending || receive.isPending}
              onUpdate={(input) => update.mutate({ id: order.id, input })}
              onConfirm={() => setPending({ kind: 'confirm', order })}
              onCancel={() => setPending({ kind: 'cancel', order })}
              onReceive={(warehouseId) => receive.mutate({ id: order.id, warehouseId })}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.kind === 'confirm' ? '발주를 확정할까요?' : '발주를 취소할까요?'}
        description={
          pending?.kind === 'confirm'
            ? `${pending.order.orderNo} 발주서를 ${pending.order.partner?.name ?? ''}에 확정합니다. 확정 후에는 수량을 고칠 수 없습니다.`
            : pending
              ? `${pending.order.orderNo} 발주서를 취소합니다.`
              : undefined
        }
        confirmLabel={pending?.kind === 'confirm' ? '확정' : '발주 취소'}
        variant={pending?.kind === 'cancel' ? 'danger' : 'primary'}
        loading={confirm.isPending || cancel.isPending}
        onConfirm={runPending}
      />
    </div>
  );
}

export { PurchaseOrdersPage };
