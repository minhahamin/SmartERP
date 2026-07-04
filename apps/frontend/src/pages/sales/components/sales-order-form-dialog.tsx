import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateSalesOrder } from '@/pages/sales/hooks/use-sales-orders';
import { usePartners } from '@/pages/partners/hooks/use-partners';
import { useProducts } from '@/pages/products/hooks/use-products';

interface SalesOrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

function SalesOrderFormDialog({ open, onOpenChange }: SalesOrderFormDialogProps) {
  const [partnerId, setPartnerId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [items, setItems] = useState<LineItem[]>([]);
  const createOrder = useCreateSalesOrder();
  const { data: partners } = usePartners({});
  const { data: products } = useProducts({});

  useEffect(() => {
    if (!open) return;
    if (!partnerId && partners && partners.length > 0) setPartnerId(partners[0].id);
    if (!orderDate) setOrderDate(new Date().toISOString().slice(0, 10));
    if (items.length === 0 && products && products.length > 0) {
      setItems([{ productId: products[0].id, quantity: 1, unitPrice: products[0].salePrice }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partners, products]);

  const addItem = () => {
    const firstProduct = products?.[0];
    if (!firstProduct) return;
    setItems([...items, { productId: firstProduct.id, quantity: 1, unitPrice: firstProduct.salePrice }]);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!partnerId || items.length === 0) return;
    createOrder.mutate(
      { partnerId, orderDate, items },
      {
        onSuccess: () => {
          onOpenChange(false);
          setItems([]);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>영업 주문 등록</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>거래처</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(partners ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="so-date">주문일</Label>
                <Input id="so-date" type="date" required value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>품목</Label>
                <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                  <Plus /> 품목 추가
                </Button>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item, index) => {
                  const product = products?.find((p) => p.id === item.productId);
                  const amount = item.quantity * item.unitPrice;
                  return (
                    <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-end gap-2 rounded-md border border-border p-2">
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">제품</Label>
                        <Select
                          value={item.productId}
                          onValueChange={(productId) => {
                            const selected = products?.find((p) => p.id === productId);
                            updateItem(index, { productId, unitPrice: selected?.salePrice ?? item.unitPrice });
                          }}
                        >
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
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">수량</Label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">단가</Label>
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs">금액</Label>
                        <p className="py-1.5 text-sm tabular-nums text-muted-foreground">
                          ₩{amount.toLocaleString()}
                          {product ? ` (${product.unit})` : ''}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" disabled={items.length <= 1} onClick={() => removeItem(index)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end border-t border-border pt-2 text-sm font-semibold text-foreground">
                합계: ₩{total.toLocaleString()}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={createOrder.isPending} disabled={items.length === 0}>
              등록
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { SalesOrderFormDialog };
