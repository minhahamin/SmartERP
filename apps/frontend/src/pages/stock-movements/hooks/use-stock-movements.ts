import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/client';
import {
  createStockMovement,
  listStockMovements,
  type CreateStockMovementInput,
  type StockMovementListQuery,
} from '@/pages/stock-movements/api/stock-movements-api';
import { toast } from '@/stores/toast-store';

const STOCK_MOVEMENTS_KEY = ['stock-movements'] as const;

export function useStockMovements(query: StockMovementListQuery) {
  return useQuery({ queryKey: [...STOCK_MOVEMENTS_KEY, query], queryFn: () => listStockMovements(query) });
}

export function useCreateStockMovement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStockMovementInput) => createStockMovement(input),
    onSuccess: (movement) => {
      queryClient.invalidateQueries({ queryKey: STOCK_MOVEMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: movement.type === 'IN' ? '입고가 등록되었습니다.' : '출고가 등록되었습니다.', variant: 'success' });
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError<ApiError>(error) ? (error.response?.data.error.message ?? error.message) : '입출고 등록에 실패했습니다.';
      toast({ title: message, variant: 'destructive' });
    },
  });
}
