import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listInventory, submitStockTake, type StockTakeCount } from '@/pages/inventory/api/inventory-api';
import { toast } from '@/stores/toast-store';

const INVENTORY_KEY = ['inventory'] as const;

export function useInventory(warehouseId: string) {
  return useQuery({ queryKey: [...INVENTORY_KEY, warehouseId], queryFn: () => listInventory(warehouseId) });
}

export function useSubmitStockTake() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ warehouseId, counts }: { warehouseId: string; counts: StockTakeCount[] }) => submitStockTake(warehouseId, counts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_KEY });
      toast({ title: '재고 실사가 반영되었습니다.', variant: 'success' });
    },
  });
}
