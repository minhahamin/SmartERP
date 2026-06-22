import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createWarehouse, listWarehouses, removeWarehouse, updateWarehouse } from '@/pages/inventory/api/warehouse-api';
import type { WarehouseInput } from '@/mocks/warehouse-store';
import { toast } from '@/stores/toast-store';

const WAREHOUSES_KEY = ['warehouses'] as const;

export function useWarehouses() {
  return useQuery({ queryKey: WAREHOUSES_KEY, queryFn: listWarehouses });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: WarehouseInput) => createWarehouse(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSES_KEY });
      toast({ title: '창고가 추가되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdateWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: WarehouseInput }) => updateWarehouse(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSES_KEY });
      toast({ title: '창고 정보가 수정되었습니다.', variant: 'success' });
    },
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAREHOUSES_KEY });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: '창고가 삭제되었습니다.', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({ title: error.message, variant: 'destructive' });
    },
  });
}
