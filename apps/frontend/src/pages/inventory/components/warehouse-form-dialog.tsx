import { useEffect, useState, type FormEvent } from 'react';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateWarehouse, useUpdateWarehouse } from '@/pages/inventory/hooks/use-warehouses';
import type { Warehouse } from '@/pages/inventory/api/warehouse-api';

interface WarehouseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouse?: Warehouse;
}

const EMPTY_FORM = { name: '', location: '' };

function WarehouseFormDialog({ open, onOpenChange, warehouse }: WarehouseFormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const isEdit = Boolean(warehouse);
  const isSubmitting = createWarehouse.isPending || updateWarehouse.isPending;

  useEffect(() => {
    if (open) {
      setForm(warehouse ? { name: warehouse.name, location: warehouse.location ?? '' } : EMPTY_FORM);
    }
  }, [open, warehouse]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isEdit && warehouse) {
      updateWarehouse.mutate({ id: warehouse.id, input: form }, { onSuccess: () => onOpenChange(false) });
    } else {
      createWarehouse.mutate(form, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEdit ? '창고 정보 수정' : '창고 추가'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wh-name">창고명</Label>
              <Input id="wh-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wh-location">위치</Label>
              <Input id="wh-location" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {isEdit ? '저장' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { WarehouseFormDialog };
