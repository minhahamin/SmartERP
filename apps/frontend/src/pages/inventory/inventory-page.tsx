import { useState } from 'react';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockTakeDialog } from '@/pages/inventory/components/stock-take-dialog';
import { useInventory } from '@/pages/inventory/hooks/use-inventory';
import { WAREHOUSES } from '@/mocks/products';
import { cn } from '@/lib/utils';

function InventoryPage() {
  const [warehouseId, setWarehouseId] = useState(WAREHOUSES[0].id);
  const [stockTakeOpen, setStockTakeOpen] = useState(false);
  const { data: rows, isLoading } = useInventory(warehouseId);
  const lowStockRows = rows?.filter((r) => r.quantity < r.safetyStock) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="재고 관리" description="창고별 실시간 재고 현황을 파악합니다." />

      <Tabs value={warehouseId} onValueChange={setWarehouseId}>
        <div className="flex items-center justify-between">
          <TabsList>
            {WAREHOUSES.map((w) => (
              <TabsTrigger key={w.id} value={w.id}>
                {w.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button onClick={() => setStockTakeOpen(true)}>
            <ClipboardCheck /> 재고 실사 시작
          </Button>
        </div>

        {WAREHOUSES.map((w) => (
          <TabsContent key={w.id} value={w.id} className="flex flex-col gap-4">
            {lowStockRows.length > 0 && (
              <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                <AlertTriangle className="size-4 shrink-0" />
                안전재고 미달 품목이 {lowStockRows.length}건 있습니다.
              </div>
            )}
            <Card className="overflow-hidden p-0">
              {isLoading || !rows ? (
                <div className="flex flex-col gap-2 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
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

      <StockTakeDialog open={stockTakeOpen} onOpenChange={setStockTakeOpen} warehouseId={warehouseId} rows={rows ?? []} />
    </div>
  );
}

export { InventoryPage };
