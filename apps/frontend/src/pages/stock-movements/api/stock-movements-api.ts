import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type StockMovementType = 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
export type StockRefType = 'PURCHASE' | 'SALES' | 'PRODUCTION' | 'RETURN' | 'ADJUSTMENT';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  warehouseId: string;
  warehouseName: string;
  type: StockMovementType;
  quantity: number;
  refType: StockRefType;
  memo: string | null;
  createdBy: string;
  createdAt: string;
}

interface RawStockMovement {
  id: string;
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  refType: StockRefType;
  memo: string | null;
  createdBy: string;
  createdAt: string;
  product: { name: string; sku: string };
  warehouse: { name: string };
}

function toStockMovement(raw: RawStockMovement): StockMovement {
  return {
    id: raw.id,
    productId: raw.productId,
    productName: raw.product.name,
    productSku: raw.product.sku,
    warehouseId: raw.warehouseId,
    warehouseName: raw.warehouse.name,
    type: raw.type,
    quantity: raw.quantity,
    refType: raw.refType,
    memo: raw.memo,
    createdBy: raw.createdBy,
    createdAt: raw.createdAt,
  };
}

export interface StockMovementListQuery {
  productId?: string;
  warehouseId?: string;
  type?: StockMovementType;
}

export interface CreateStockMovementInput {
  productId: string;
  warehouseId: string;
  type: StockMovementType;
  quantity: number;
  refType: StockRefType;
  memo?: string;
}

/** 백엔드는 productId/type/from/to만 필터링하므로(docs/08 8.4.4) warehouseId는 응답을 받은 뒤 프론트에서 걸러낸다 */
export async function listStockMovements(query: StockMovementListQuery): Promise<StockMovement[]> {
  const { data } = await apiClient.get<ApiSuccess<RawStockMovement[]>>('/stock-movements', {
    params: { productId: query.productId, type: query.type, page: 1, limit: 100 },
  });
  const items = data.data.map(toStockMovement);
  return query.warehouseId ? items.filter((m) => m.warehouseId === query.warehouseId) : items;
}

export async function createStockMovement(input: CreateStockMovementInput): Promise<{ id: string; type: StockMovementType }> {
  const { data } = await apiClient.post<ApiSuccess<{ id: string; type: StockMovementType }>>('/stock-movements', input);
  return data.data;
}
