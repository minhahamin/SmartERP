import { useEffect, useState } from 'react';
import { AlertTriangle, ClipboardCheck, Settings, Warehouse as WarehouseIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockTakeDialog } from '@/pages/inventory/components/stock-take-dialog';
import { WarehouseManageDialog } from '@/pages/inventory/components/warehouse-manage-dialog';
import { useInventory } from '@/pages/inventory/hooks/use-inventory';
import { useWarehouses } from '@/pages/inventory/hooks/use-warehouses';
import { cn } from '@/lib/utils';

function InventoryPage() {
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
  const [warehouseId, setWarehouseId] = useState<string | null>(null);
  const [stockTakeOpen, setStockTakeOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (!warehouses) return;
    if (!warehouseId || !warehouses.some((w) => w.id === warehouseId)) {
      setWarehouseId(warehouses[0]?.id ?? null);
    }
  }, [warehouses, warehouseId]);

  const { data: rows, isLoading: inventoryLoading } = useInventory(warehouseId ?? '');
  const lowStockRows = rows?.filter((r) => r.quantity < r.safetyStock) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="재고 관리"
        description="창고별 실시간 재고 현황을 파악합니다."
        actions={
          <Button variant="secondary" onClick={() => setManageOpen(true)}>
            <Settings /> 창고 관리
          </Button>
        }
      />

      {warehousesLoading || !warehouses || !warehouseId ? (
        <Skeleton className="h-96" />
      ) : warehouses.length === 0 ? (
        <EmptyState
          icon={WarehouseIcon}
          title="등록된 창고가 없습니다"
          description="창고 관리에서 창고를 먼저 추가해주세요."
          action={<Button onClick={() => setManageOpen(true)}>창고 추가</Button>}
        />
      ) : (
        <Tabs value={warehouseId} onValueChange={setWarehouseId}>
          <div className="flex items-center justify-between">
            <TabsList>
              {warehouses.map((w) => (
                <TabsTrigger key={w.id} value={w.id}>
                  {w.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button onClick={() => setStockTakeOpen(true)}>
              <ClipboardCheck /> 재고 실사 시작
            </Button>
          </div>

          {warehouses.map((w) => (
            <TabsContent key={w.id} value={w.id} className="flex flex-col gap-4">
              {lowStockRows.length > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  <AlertTriangle className="size-4 shrink-0" />
                  안전재고 미달 품목이 {lowStockRows.length}건 있습니다.
                </div>
              )}
              <Card className="overflow-hidden p-0">
                {inventoryLoading || !rows ? (
                  <div className="flex flex-col gap-2 p-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-10" />
                    ))}
                  </div>
                ) : rows.length === 0 ? (
                  <EmptyState icon={WarehouseIcon} title="이 창고에는 아직 재고 데이터가 없습니다" description="입출고 관리에서 입고를 등록하면 표시됩니다." />
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-gray-50 text-left text-xs font-medium text-muted-foreground">
                        <th className="px-4 py-2.5">제품</th>
                        <th className="px-4 py-2.5 text-right">현재고</th>
                        <th className="px-4 py-2.5 text-right">안전재고</th>
                        <th className="px-4 py-2.5">상태</th>
                        <th className="px-4 py-2.5">최근 변동일</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const low = row.quantity < row.safetyStock;
                        return (
                          <tr key={row.productId} className={cn('border-b border-border last:border-0', low && 'bg-red-50/60')}>
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-foreground">{row.productName}</span>{' '}
                              <span className="font-mono text-xs text-muted-foreground">{row.sku}</span>
                            </td>
                            <td className={cn('px-4 py-2.5 text-right tabular-nums font-medium', low ? 'text-red-600' : 'text-foreground')}>
                              {row.quantity}{row.unit}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{row.safetyStock}{row.unit}</td>
                            <td className="px-4 py-2.5">
                              <Badge variant={low ? 'danger' : 'success'}>{low ? '부족' : '정상'}</Badge>
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{row.lastMovementDate}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      <StockTakeDialog open={stockTakeOpen} onOpenChange={setStockTakeOpen} warehouseId={warehouseId ?? ''} rows={rows ?? []} />
      <WarehouseManageDialog open={manageOpen} onOpenChange={setManageOpen} />
    </div>
  );
}

export { InventoryPage };
