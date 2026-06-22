import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StockMovementTable } from '@/pages/stock-movements/components/stock-movement-table';
import { StockMovementFormDialog } from '@/pages/stock-movements/components/stock-movement-form-dialog';
import { useStockMovements } from '@/pages/stock-movements/hooks/use-stock-movements';
import { useWarehouses } from '@/pages/inventory/hooks/use-warehouses';
import { PRODUCTS } from '@/mocks/products';
import type { StockMovementType } from '@/mocks/stock-movements';

function StockMovementsPage() {
  const [productId, setProductId] = useState('ALL');
  const [warehouseId, setWarehouseId] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [formMode, setFormMode] = useState<StockMovementType | null>(null);
  const { data: warehouses } = useWarehouses();

  const { data: movements, isLoading } = useStockMovements({
    productId: productId === 'ALL' ? undefined : productId,
    warehouseId: warehouseId === 'ALL' ? undefined : warehouseId,
    type: type === 'ALL' ? undefined : (type as StockMovementType),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="입출고 관리" description="재고 변동 트랜잭션을 등록하고 이력을 조회합니다." />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 제품</SelectItem>
              {PRODUCTS.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={warehouseId} onValueChange={setWarehouseId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 창고</SelectItem>
              {(warehouses ?? []).map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체 유형</SelectItem>
              <SelectItem value="IN">입고</SelectItem>
              <SelectItem value="OUT">출고</SelectItem>
              <SelectItem value="ADJUST">조정</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setFormMode('IN')}>
            <ArrowDownToLine /> 입고 등록
          </Button>
          <Button onClick={() => setFormMode('OUT')}>
            <ArrowUpFromLine /> 출고 등록
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {isLoading || !movements ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : (
          <StockMovementTable movements={movements} />
        )}
      </Card>

      {formMode && <StockMovementFormDialog open={Boolean(formMode)} onOpenChange={() => setFormMode(null)} mode={formMode} />}
    </div>
  );
}

export { StockMovementsPage };
