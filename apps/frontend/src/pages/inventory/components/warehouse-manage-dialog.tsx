import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { WarehouseFormDialog } from '@/pages/inventory/components/warehouse-form-dialog';
import { useDeleteWarehouse, useWarehouses } from '@/pages/inventory/hooks/use-warehouses';
import type { Warehouse } from '@/pages/inventory/api/warehouse-api';

interface WarehouseManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WarehouseManageDialog({ open, onOpenChange }: WarehouseManageDialogProps) {
  const { data: warehouses, isLoading } = useWarehouses();
  const deleteWarehouse = useDeleteWarehouse();
  const [formOpen, setFormOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  const openCreate = () => {
    setEditingWarehouse(undefined);
    setFormOpen(true);
  };

  const openEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle>창고 관리</DialogTitle>
            <Button size="sm" onClick={openCreate}>
              <Plus /> 창고 추가
            </Button>
          </DialogHeader>
          <div className="flex flex-col gap-2 p-5">
            {isLoading || !warehouses ? (
              <>
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </>
            ) : (
              warehouses.map((warehouse) => (
                <div key={warehouse.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{warehouse.name}</p>
                    <p className="text-xs text-muted-foreground">{warehouse.location}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(warehouse)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(warehouse)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <WarehouseFormDialog open={formOpen} onOpenChange={setFormOpen} warehouse={editingWarehouse} />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`'${deleteTarget?.name}' 창고를 삭제할까요?`}
        description="재고가 남아있는 창고는 삭제할 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
        loading={deleteWarehouse.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteWarehouse.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </>
  );
}

export { WarehouseManageDialog };
