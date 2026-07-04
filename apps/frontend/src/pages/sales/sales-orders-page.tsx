import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SalesOrderTable } from '@/pages/sales/components/sales-order-table';
import { SalesOrderFormDialog } from '@/pages/sales/components/sales-order-form-dialog';
import { SalesOrderDetailDrawer } from '@/pages/sales/components/sales-order-detail-drawer';
import { useSalesOrders } from '@/pages/sales/hooks/use-sales-orders';
import { usePartners } from '@/pages/partners/hooks/use-partners';
import { STATUS_LABEL } from '@/pages/sales/status-labels';
import type { SalesOrder, SalesOrderStatus } from '@/pages/sales/api/sales-orders-api';

function SalesOrdersPage() {
  const [search, setSearch] = useState('');
  const [partnerId, setPartnerId] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  const { data: partners } = usePartners({});
  const { data: orders, isLoading } = useSalesOrders({
    search: search || undefined,
    partnerId: partnerId === 'ALL' ? undefined : partnerId,
    status: status === 'ALL' ? undefined : (status as SalesOrderStatus),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="영업 관리" description="영업 주문을 등록하고 견적/확정/출고/인보이스 상태를 관리합니다." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="주문번호/거래처명 검색" className="pl-8" />
          </div>
          <Select value={partnerId} onValueChange={setPartnerId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 거래처</SelectItem>
              {(partners ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 상태</SelectItem>
              {(Object.entries(STATUS_LABEL) as [SalesOrderStatus, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus /> 주문 등록
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading || !orders ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <SalesOrderTable orders={orders} onRowClick={setSelectedOrder} />
        )}
      </Card>

      <SalesOrderFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <SalesOrderDetailDrawer order={selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)} />
    </div>
  );
}

export { SalesOrdersPage };
