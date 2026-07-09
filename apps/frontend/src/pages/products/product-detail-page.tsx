import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Factory, Package, Pencil, PowerOff, Truck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ProductFormDialog } from '@/pages/products/components/product-form-dialog';
import { useInventoryRows, useProduct, useSetProductActive } from '@/pages/products/hooks/use-products';
import { toAbsoluteImageUrl } from '@/pages/products/api/products-api';
import { useStockMovements } from '@/pages/stock-movements/hooks/use-stock-movements';
import type { StockMovement } from '@/pages/stock-movements/api/stock-movements-api';
import { useProductionOrders } from '@/pages/production/hooks/use-production';
import type { ProductionStatus } from '@/pages/production/api/production-api';
import { useEmployees } from '@/pages/employees/hooks/use-employees';
import { ROUTES } from '@/config/routes';

const PRODUCTION_STATUS_LABEL: Record<ProductionStatus, string> = {
  PLANNED: '계획',
  IN_PROGRESS: '진행중',
  DELAYED: '지연',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

const MOVEMENT_TYPE_LABEL: Record<StockMovement['type'], string> = { IN: '입고', OUT: '출고', ADJUST: '조정', TRANSFER: '이동' };
const MOVEMENT_REF_LABEL: Record<StockMovement['refType'], string> = {
  PURCHASE: '구매',
  SALES: '판매',
  PRODUCTION: '생산',
  RETURN: '반품',
  ADJUSTMENT: '조정',
};

function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const { data: product, isLoading } = useProduct(id);
  const { data: inventoryRows } = useInventoryRows();
  const { data: movements, isLoading: movementsLoading } = useStockMovements({ productId: id });
  const { data: productionOrders, isLoading: productionLoading } = useProductionOrders({ productId: id });
  const { data: employees } = useEmployees({ status: 'ACTIVE', page: 1, limit: 100 });
  const setProductActive = useSetProductActive();
  const employeeName = (empId: string) => employees?.items.find((e) => e.id === empId)?.name ?? empId;

  if (isLoading || !product) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const inventory = inventoryRows?.filter((r) => r.productId === product.id) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate(ROUTES.products)}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> 제품 관리
      </button>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-md bg-gray-50 text-muted-foreground">
            {product.imageUrl ? (
              <img src={toAbsoluteImageUrl(product.imageUrl)} alt={product.name} className="size-full object-cover" />
            ) : (
              <Package className="size-10" />
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{product.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
          </div>
          <Badge variant={product.isActive ? 'success' : 'default'}>{product.isActive ? '활성' : '단종'}</Badge>
          <div className="mt-2 flex w-full flex-col gap-1.5 border-t border-border pt-3 text-left text-xs text-muted-foreground">
            <span>분류: {product.category ?? '-'}</span>
            <span>단위: {product.unit}</span>
            <span>판매가: {product.salePrice.toLocaleString()}원</span>
            <span>원가: {product.costPrice.toLocaleString()}원</span>
            <span>안전재고: {product.safetyStock}{product.unit}</span>
          </div>
          <div className="mt-2 flex w-full gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setEditOpen(true)}>
              <Pencil /> 수정
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => setToggleConfirmOpen(true)}>
              <PowerOff /> {product.isActive ? '단종' : '활성화'}
            </Button>
          </div>
        </Card>

        <Card className="p-0">
          <Tabs defaultValue="inventory" className="gap-0">
            <TabsList className="px-5 pt-4">
              <TabsTrigger value="inventory">재고현황</TabsTrigger>
              <TabsTrigger value="movements">입출고이력</TabsTrigger>
              <TabsTrigger value="production">생산이력</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="px-5 py-5">
              {inventory.length === 0 ? (
                <EmptyState icon={Package} title="등록된 재고가 없습니다" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2">창고</th>
                      <th className="py-2 text-right">현재고</th>
                      <th className="py-2 text-right">안전재고</th>
                      <th className="py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((inv) => {
                      const low = inv.quantity < product.safetyStock;
                      return (
                        <tr key={inv.warehouseId} className="border-b border-border last:border-0">
                          <td className="py-2">{inv.warehouseName}</td>
                          <td className={`py-2 text-right tabular-nums font-medium ${low ? 'text-red-600' : 'text-foreground'}`}>{inv.quantity}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">{product.safetyStock}</td>
                          <td className="py-2">
                            <Badge variant={low ? 'danger' : 'success'}>{low ? '부족' : '정상'}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </TabsContent>

            <TabsContent value="movements" className="px-5 py-5">
              {movementsLoading || !movements ? (
                <Skeleton className="h-40" />
              ) : movements.length === 0 ? (
                <EmptyState icon={Truck} title="입출고 이력이 없습니다" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2">일시</th>
                      <th className="py-2">창고</th>
                      <th className="py-2">유형</th>
                      <th className="py-2 text-right">수량</th>
                      <th className="py-2">사유</th>
                      <th className="py-2">처리자</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const isOut = m.type === 'OUT' || (m.type === 'ADJUST' && m.quantity < 0);
                      return (
                        <tr key={m.id} className="border-b border-border last:border-0">
                          <td className="py-2 tabular-nums text-muted-foreground">{m.createdAt.slice(0, 16).replace('T', ' ')}</td>
                          <td className="py-2 text-muted-foreground">{m.warehouseName}</td>
                          <td className="py-2">
                            <Badge variant={m.type === 'IN' ? 'success' : m.type === 'OUT' ? 'danger' : 'default'}>
                              {MOVEMENT_TYPE_LABEL[m.type]}
                            </Badge>
                          </td>
                          <td className={`py-2 text-right tabular-nums font-medium ${isOut ? 'text-red-600' : 'text-success-foreground'}`}>
                            {isOut ? '' : '+'}
                            {m.quantity}
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {MOVEMENT_REF_LABEL[m.refType]}
                            {m.memo ? ` · ${m.memo}` : ''}
                          </td>
                          <td className="py-2 text-muted-foreground">{employeeName(m.createdBy)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </TabsContent>

            <TabsContent value="production" className="px-5 py-5">
              {productionLoading || !productionOrders ? (
                <Skeleton className="h-40" />
              ) : productionOrders.length === 0 ? (
                <EmptyState icon={Factory} title="생산 이력이 없습니다" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="py-2">오더번호</th>
                      <th className="py-2">라인</th>
                      <th className="py-2 text-right">계획/생산</th>
                      <th className="py-2">시작일</th>
                      <th className="py-2">마감일</th>
                      <th className="py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border last:border-0">
                        <td className="py-2 font-medium text-foreground">{order.orderNo}</td>
                        <td className="py-2 text-muted-foreground">{order.lineName ?? '-'}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {order.producedQty}/{order.plannedQty}{order.unit}
                        </td>
                        <td className="py-2 tabular-nums text-muted-foreground">{order.startDate.slice(0, 10)}</td>
                        <td className="py-2 tabular-nums text-muted-foreground">{order.dueDate.slice(0, 10)}</td>
                        <td className="py-2">
                          <Badge
                            variant={order.status === 'DELAYED' ? 'danger' : order.status === 'COMPLETED' ? 'success' : 'default'}
                          >
                            {PRODUCTION_STATUS_LABEL[order.status]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={product} />

      <ConfirmDialog
        open={toggleConfirmOpen}
        onOpenChange={setToggleConfirmOpen}
        title={product.isActive ? '제품을 단종 처리할까요?' : '제품을 다시 활성화할까요?'}
        variant={product.isActive ? 'danger' : 'primary'}
        confirmLabel={product.isActive ? '단종 처리' : '활성화'}
        loading={setProductActive.isPending}
        onConfirm={() =>
          setProductActive.mutate(
            { id: product.id, isActive: !product.isActive },
            { onSuccess: () => setToggleConfirmOpen(false) },
          )
        }
      />
    </div>
  );
}

export { ProductDetailPage };
