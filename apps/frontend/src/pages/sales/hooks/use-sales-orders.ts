import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSalesOrder,
  listSalesOrders,
  updateSalesOrderStatus,
  type CreateSalesOrderInput,
  type SalesOrderListQuery,
  type SalesOrderStatus,
} from '@/pages/sales/api/sales-orders-api';
import { toast } from '@/stores/toast-store';

const SALES_ORDERS_KEY = ['sales-orders'] as const;

export function useSalesOrders(query: SalesOrderListQuery) {
  return useQuery({ queryKey: [...SALES_ORDERS_KEY, query], queryFn: () => listSalesOrders(query) });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSalesOrderInput) => createSalesOrder(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: '영업 주문이 등록되었습니다.', variant: 'success' });
    },
  });
}

export function useUpdateSalesOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SalesOrderStatus }) => updateSalesOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_ORDERS_KEY });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({ title: '주문 상태가 변경되었습니다.', variant: 'success' });
    },
  });
}
