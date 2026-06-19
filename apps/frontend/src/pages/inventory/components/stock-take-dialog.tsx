import { useEffect, useState } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubmitStockTake } from '@/pages/inventory/hooks/use-inventory';
import type { InventoryRow } from '@/pages/inventory/api/inventory-api';

interface StockTakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  rows: InventoryRow[];
}

function StockTakeDialog({ open, onOpenChange, warehouseId, rows }: StockTakeDialogProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const submitStockTake = useSubmitStockTake();

  useEffect(() => {
    if (open) {
      setCounts(Object.fromEntries(rows.map((r) => [r.productId, r.quantity])));
    }
  }, [open, rows]);

  const handleSubmit = () => {
    submitStockTake.mutate(
      { warehouseId, counts: Object.entries(counts).map(([productId, countedQty]) => ({ productId, countedQty })) },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>재고 실사</DialogTitle>
          <DialogDescription>실측 수량을 입력하면 시스템 수량과의 차이가 자동으로 계산됩니다.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2">제품</th>
                  <th className="py-2 text-right">시스템 수량</th>
                  <th className="py-2 text-right">실측 수량</th>
                  <th className="py-2 text-right">차이</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const counted = counts[row.productId] ?? row.quantity;
                  const diff = counted - row.quantity;
                  return (
                    <tr key={row.productId} className="border-b border-border last:border-0">
                      <td className="py-2">{row.productName}</td>
                      <td className="py-2 text-right tabular-nums text-muted-foreground">{row.quantity}</td>
                      <td className="py-2 text-right">
                        <Input
                          type="number"
                          value={counted}
                          onChange={(e) => setCounts({ ...counts, [row.productId]: Number(e.target.value) || 0 })}
                          className="ml-auto w-24 text-right tabular-nums"
                        />
                      </td>
                      <td className={`py-2 text-right tabular-nums font-medium ${diff === 0 ? 'text-muted-foreground' : diff > 0 ? 'text-success-foreground' : 'text-red-600'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} loading={submitStockTake.isPending}>
            실사 확정
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { StockTakeDialog };
