export type StockMovementType = 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
export type StockRefType = 'PURCHASE' | 'SALES' | 'PRODUCTION' | 'RETURN' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  refType: StockRefType;
  memo: string;
  createdBy: string;
  createdAt: string;
}

export const STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'sm-1', productId: 'product-1', warehouseId: 'wh-1', type: 'OUT', quantity: 80, refType: 'SALES', memo: '대한물산 6월 정기 출고', createdBy: 'emp-1024', createdAt: '2026-06-18T09:20:00' },
  { id: 'sm-2', productId: 'product-2', warehouseId: 'wh-1', type: 'OUT', quantity: 60, refType: 'SALES', memo: '우진테크 납품', createdBy: 'emp-1024', createdAt: '2026-06-17T14:05:00' },
  { id: 'sm-3', productId: 'product-3', warehouseId: 'wh-2', type: 'OUT', quantity: 40, refType: 'SALES', memo: '삼진산업 포장재 출고', createdBy: 'emp-1101', createdAt: '2026-06-17T11:30:00' },
  { id: 'sm-4', productId: 'product-4', warehouseId: 'wh-2', type: 'OUT', quantity: 22, refType: 'PRODUCTION', memo: '생산 투입(PO-2026-014)', createdBy: 'emp-1031', createdAt: '2026-06-16T08:45:00' },
  { id: 'sm-5', productId: 'product-9', warehouseId: 'wh-1', type: 'IN', quantity: 200, refType: 'PURCHASE', memo: '미래소재 구매입고', createdBy: 'emp-1107', createdAt: '2026-06-15T10:00:00' },
  { id: 'sm-6', productId: 'product-5', warehouseId: 'wh-1', type: 'IN', quantity: 150, refType: 'PURCHASE', memo: '베스트공업 구매입고', createdBy: 'emp-1107', createdAt: '2026-06-14T13:15:00' },
  { id: 'sm-7', productId: 'product-1', warehouseId: 'wh-2', type: 'IN', quantity: 100, refType: 'PRODUCTION', memo: '생산 완료 입고(PO-2026-011)', createdBy: 'emp-1102', createdAt: '2026-06-13T16:40:00' },
  { id: 'sm-8', productId: 'product-7', warehouseId: 'wh-2', type: 'IN', quantity: 80, refType: 'PURCHASE', memo: '정기 구매입고', createdBy: 'emp-1104', createdAt: '2026-06-12T09:10:00' },
  { id: 'sm-9', productId: 'product-6', warehouseId: 'wh-1', type: 'OUT', quantity: 15, refType: 'PRODUCTION', memo: '생산 투입(PO-2026-013)', createdBy: 'emp-1031', createdAt: '2026-06-11T08:30:00' },
  { id: 'sm-10', productId: 'product-2', warehouseId: 'wh-1', type: 'ADJUST', quantity: -4, refType: 'ADJUSTMENT', memo: '재고 실사 차이 조정', createdBy: 'emp-1024', createdAt: '2026-06-10T17:00:00' },
  { id: 'sm-11', productId: 'product-8', warehouseId: 'wh-2', type: 'OUT', quantity: 18, refType: 'SALES', memo: '동양상사 납품', createdBy: 'emp-1101', createdAt: '2026-06-09T10:50:00' },
  { id: 'sm-12', productId: 'product-3', warehouseId: 'wh-1', type: 'IN', quantity: 100, refType: 'PURCHASE', memo: '포장재 구매입고', createdBy: 'emp-1104', createdAt: '2026-06-08T11:20:00' },
  { id: 'sm-13', productId: 'product-4', warehouseId: 'wh-2', type: 'IN', quantity: 5, refType: 'RETURN', memo: '거래처 반품 입고', createdBy: 'emp-1101', createdAt: '2026-06-07T15:35:00' },
  { id: 'sm-14', productId: 'product-10', warehouseId: 'wh-1', type: 'OUT', quantity: 12, refType: 'PRODUCTION', memo: '생산 투입(PO-2026-012)', createdBy: 'emp-1102', createdAt: '2026-06-06T09:05:00' },
  { id: 'sm-15', productId: 'product-9', warehouseId: 'wh-1', type: 'OUT', quantity: 90, refType: 'SALES', memo: '정성유통 출고', createdBy: 'emp-1104', createdAt: '2026-06-05T13:45:00' },
  { id: 'sm-16', productId: 'product-1', warehouseId: 'wh-1', type: 'IN', quantity: 60, refType: 'PRODUCTION', memo: '생산 완료 입고(PO-2026-009)', createdBy: 'emp-1031', createdAt: '2026-06-04T16:00:00' },
];
