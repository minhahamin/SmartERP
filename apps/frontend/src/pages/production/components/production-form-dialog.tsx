import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProductionOrder } from '@/pages/production/hooks/use-production';
import { useProducts } from '@/pages/products/hooks/use-products';
import { useWarehouses } from '@/pages/inventory/hooks/use-warehouses';

interface ProductionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LINES = ['1라인', '2라인'];

function ProductionFormDialog({ open, onOpenChange }: ProductionFormDialogProps) {
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [plannedQty, setPlannedQty] = useState(100);
  const [lineName, setLineName] = useState(LINES[0]);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const createOrder = useCreateProductionOrder();
  const { data: products } = useProducts({});
  const { data: warehouses } = useWarehouses();

  useEffect(() => {
    if (!open) return;
    if (!productId && products && products.length > 0) setProductId(products[0].id);
    if (!warehouseId && warehouses && warehouses.length > 0) setWarehouseId(warehouses[0].id);
    if (!startDate || !dueDate) {
      const today = new Date();
      const due = new Date(today);
      due.setDate(due.getDate() + 7);
      setStartDate(today.toISOString().slice(0, 10));
      setDueDate(due.toISOString().slice(0, 10));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, products, warehouses]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createOrder.mutate(
      { productId, plannedQty, lineName, startDate, dueDate, warehouseId },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>생산 오더 등록</DialogTitle>
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
                    {(products ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="po-qty">계획 수량</Label>
                <Input id="po-qty" type="number" min={1} required value={plannedQty} onChange={(e) => setPlannedQty(Number(e.target.value) || 0)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>생산 라인</Label>
                <Select value={lineName} onValueChange={setLineName}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINES.map((line) => (
                      <SelectItem key={line} value={line}>
                        {line}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>완료 시 입고 창고</Label>
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
                <Label htmlFor="po-start">착수일</Label>
                <Input id="po-start" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="po-due">완료 예정일</Label>
                <Input id="po-due" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={createOrder.isPending}>
              등록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ProductionFormDialog };
