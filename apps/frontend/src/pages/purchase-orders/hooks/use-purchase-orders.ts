import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiError } from '@/lib/api/client';
import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  generatePurchaseDrafts,
  listPurchaseOrders,
  receivePurchaseOrder,
  updatePurchaseOrder,
  type PurchaseOrderStatus,
  type UpdatePurchaseOrderInput,
} from '@/pages/purchase-orders/api/purchase-orders-api';
import { toast } from '@/stores/toast-store';

const PURCHASE_ORDERS_KEY = ['purchase-orders'] as const;

function errorMessage(error: unknown, fallback: string): string {
  return axios.isAxiosError<ApiError>(error) ? (error.response?.data.error.message ?? error.message) : fallback;
}

export function usePurchaseOrders(status?: PurchaseOrderStatus) {
  return useQuery({ queryKey: [...PURCHASE_ORDERS_KEY, status ?? 'ALL'], queryFn: () => listPurchaseOrders(status) });
}

/** 발주서 상태 전이 공통 처리: 성공하면 목록(과 입고 시 재고)을 새로 고치고, 실패하면 서버 메시지를 보여준다 */
function useOrderMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successTitle: string,
  failureFallback: string,
  alsoInvalidate: readonly (readonly string[])[] = [],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY });
      alsoInvalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      toast({ title: successTitle, variant: 'success' });
    },
    onError: (error: unknown) => toast({ title: errorMessage(error, failureFallback), variant: 'destructive' }),
  });
}

export function useGenerateDrafts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generatePurchaseDrafts,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_ORDERS_KEY });
      if (result.skipped) toast({ title: result.reason ?? '이미 실행 중입니다.', variant: 'default' });
      else if (!result.created) toast({ title: '새로 발주할 안전재고 미달 품목이 없습니다.', variant: 'default' });
      else toast({ title: `발주 초안 ${result.created}건을 만들었습니다.`, variant: 'success' });
    },
    onError: (error: unknown) => toast({ title: errorMessage(error, '발주 초안 생성에 실패했습니다.'), variant: 'destructive' }),
  });
}

export function useUpdatePurchaseOrder() {
  return useOrderMutation(
    ({ id, input }: { id: string; input: UpdatePurchaseOrderInput }) => updatePurchaseOrder(id, input),
    '발주서를 수정했습니다.',
    '발주서 수정에 실패했습니다.',
  );
}

export function useConfirmPurchaseOrder() {
  return useOrderMutation(confirmPurchaseOrder, '발주를 확정했습니다.', '발주 확정에 실패했습니다.');
}

export function useCancelPurchaseOrder() {
  return useOrderMutation(cancelPurchaseOrder, '발주를 취소했습니다.', '발주 취소에 실패했습니다.');
}

export function useReceivePurchaseOrder() {
  return useOrderMutation(
    ({ id, warehouseId }: { id: string; warehouseId: string }) => receivePurchaseOrder(id, warehouseId),
    '입고 처리했습니다. 재고가 반영되었습니다.',
    '입고 처리에 실패했습니다.',
    [['inventory'], ['stock-movements']],
  );
}
