import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useCreateStockMovement } from '@/pages/stock-movements/hooks/use-stock-movements';
import { checkAvailableStock } from '@/pages/stock-movements/api/stock-movements-api';
import { useWarehouses } from '@/pages/inventory/hooks/use-warehouses';
import { PRODUCTS } from '@/mocks/products';
import { useAuthStore } from '@/stores/auth-store';
import type { StockMovementType, StockRefType } from '@/mocks/stock-movements';

interface StockMovementFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StockMovementType;
}

const REF_TYPE_LABEL: Record<StockRefType, string> = {
  PURCHASE: '구매',
  SALES: '판매',
  PRODUCTION: '생산',
  RETURN: '반품',
  ADJUSTMENT: '조정',
};

function StockMovementFormDialog({ open, onOpenChange, mode }: StockMovementFormDialogProps) {
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [refType, setRefType] = useState<StockRefType>(mode === 'IN' ? 'PURCHASE' : 'SALES');
  const [memo, setMemo] = useState('');
  const [insufficientConfirmOpen, setInsufficientConfirmOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const createMovement = useCreateStockMovement();
  const { data: warehouses } = useWarehouses();

  useEffect(() => {
    if (!warehouseId && warehouses && warehouses.length > 0) {
      setWarehouseId(warehouses[0].id);
    }
  }, [warehouses, warehouseId]);

  const submit = () => {
    if (!user) return;
    createMovement.mutate(
      { productId, warehouseId, type: mode, quantity, refType, memo, createdBy: user.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          setQuantity(1);
          setMemo('');
          setInsufficientConfirmOpen(false);
        },
      },
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'OUT' && quantity > checkAvailableStock(productId, warehouseId)) {
      setInsufficientConfirmOpen(true);
      return;
    }
    submit();
  };

  const available = checkAvailableStock(productId, warehouseId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{mode === 'IN' ? '입고 등록' : '출고 등록'}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>제품</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>창고</Label>
                  <Select value={warehouseId} onValueChange={setWarehouseId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(warehouses ?? []).map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="sm-qty">수량</Label>
                  <Input id="sm-qty" type="number" min={1} required value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 0)} />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>사유</Label>
                  <Select value={refType} onValueChange={(value) => setRefType(value as StockRefType)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REF_TYPE_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="sm-memo">메모</Label>
                  <Input id="sm-memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
                </div>
                {mode === 'OUT' && (
                  <p className="col-span-2 text-xs text-muted-foreground">현재 가용 재고: {available}{PRODUCTS.find((p) => p.id === productId)?.unit}</p>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                취소
              </Button>
              <Button type="submit" loading={createMovement.isPending}>
                등록
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={insufficientConfirmOpen}
        onOpenChange={setInsufficientConfirmOpen}
        title="현재고가 부족합니다"
        description={`가용 재고는 ${available}개입니다. 그래도 ${quantity}개를 출고 처리할까요?`}
        confirmLabel="강제 출고"
        variant="danger"
        loading={createMovement.isPending}
        onConfirm={submit}
      />
    </>
  );
}

export { StockMovementFormDialog };
