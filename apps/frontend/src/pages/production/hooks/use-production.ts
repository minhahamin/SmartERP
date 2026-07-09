import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/client';
import {
  createProductionOrder,
  listProductionOrders,
  updateProductionStatus,
  type CreateProductionOrderInput,
  type ProductionOrderListQuery,
  type ProductionStatus,
} from '@/pages/production/api/production-api';
import { toast } from '@/stores/toast-store';

const PRODUCTION_KEY = ['production-orders'] as const;

export function useProductionOrders(query: ProductionOrderListQuery = {}) {
  return useQuery({ queryKey: [...PRODUCTION_KEY, query], queryFn: () => listProductionOrders(query) });
}

export function useCreateProductionOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductionOrderInput) => createProductionOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_KEY });
      toast({ title: '생산 오더가 등록되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdateProductionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProductionStatus }) => updateProductionStatus(id, status),
    onSuccess: (_order, variables) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTION_KEY });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      if (variables.status === 'COMPLETED') {
        toast({ title: '생산이 완료되어 재고에 자동 입고되었습니다.', variant: 'success' });
      } else {
        toast({ title: '상태가 변경되었습니다.', variant: 'success' });
      }
    },
    onError: (error: unknown) => {
      const message = axios.isAxiosError<ApiError>(error) ? (error.response?.data.error.message ?? error.message) : '상태 변경에 실패했습니다.';
      toast({ title: message, variant: 'destructive' });
    },
  });
}
