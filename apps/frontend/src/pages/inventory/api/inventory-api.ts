import { PRODUCTS } from '@/mocks/products';
import { getInventorySnapshot, setQuantity } from '@/mocks/inventory-store';
import { delay } from '@/mocks/delay';

const lastMovementDate: Record<string, string> = {};

export interface InventoryRow {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  safetyStock: number;
  lastMovementDate: string;
}

export async function listInventory(warehouseId: string): Promise<InventoryRow[]> {
  await delay();
  return getInventorySnapshot()
    .filter((i) => i.warehouseId === warehouseId)
    .map((i) => {
      const product = PRODUCTS.find((p) => p.id === i.productId);
      return {
        productId: i.productId,
        productName: product?.name ?? '-',
        sku: product?.sku ?? '-',
        unit: product?.unit ?? 'EA',
        quantity: i.quantity,
        safetyStock: product?.safetyStock ?? 0,
        lastMovementDate: lastMovementDate[`${i.productId}-${warehouseId}`] ?? '-',
      };
    });
}

export interface StockTakeCount {
  productId: string;
  countedQty: number;
}

export async function submitStockTake(warehouseId: string, counts: StockTakeCount[]): Promise<void> {
  await delay(500);
  const today = '2026-06-19';
  for (const { productId, countedQty } of counts) {
    setQuantity(productId, warehouseId, countedQty);
    lastMovementDate[`${productId}-${warehouseId}`] = today;
  }
}
