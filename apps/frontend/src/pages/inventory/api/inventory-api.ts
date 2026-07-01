import { apiClient, type ApiSuccess } from '@/lib/api/client';

export interface InventoryRow {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  safetyStock: number;
  lastMovementDate: string;
}

interface RawInventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  updatedAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    safetyStock: number;
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toInventoryRow(raw: RawInventoryItem): InventoryRow {
  return {
    productId: raw.productId,
    productName: raw.product.name,
    sku: raw.product.sku,
    unit: raw.product.unit,
    quantity: raw.quantity,
    safetyStock: raw.product.safetyStock,
    lastMovementDate: formatDate(raw.updatedAt),
  };
}

export async function listInventory(warehouseId: string): Promise<InventoryRow[]> {
  const { data } = await apiClient.get<ApiSuccess<RawInventoryItem[]>>('/inventory', {
    params: { warehouseId, page: 1, limit: 200 },
  });
  return data.data.map(toInventoryRow);
}

export interface StockTakeCount {
  productId: string;
  countedQty: number;
}

export async function submitStockTake(warehouseId: string, counts: StockTakeCount[]): Promise<void> {
  await apiClient.post('/inventory/stock-take', {
    warehouseId,
    items: counts.map(({ productId, countedQty }) => ({ productId, actualQuantity: countedQty })),
  });
}
