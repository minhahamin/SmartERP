import { useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProductionOrder } from '@/pages/production/hooks/use-production';
import { PRODUCTS } from '@/mocks/products';
import { useAuthStore } from '@/stores/auth-store';

interface ProductionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LINES = ['1라인', '2라인'];

function ProductionFormDialog({ open, onOpenChange }: ProductionFormDialogProps) {
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [plannedQty, setPlannedQty] = useState(100);
  const [lineName, setLineName] = useState(LINES[0]);
  const [startDate, setStartDate] = useState('2026-06-22');
  const [dueDate, setDueDate] = useState('2026-06-29');
  const user = useAuthStore((state) => state.user);
  const createOrder = useCreateProductionOrder();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    createOrder.mutate(
      { productId, plannedQty, lineName, startDate, dueDate, managerId: user.id },
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
                    {PRODUCTS.map((p) => (
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
