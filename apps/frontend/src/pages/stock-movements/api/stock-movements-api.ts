import { STOCK_MOVEMENTS, type StockMovement, type StockMovementType, type StockRefType } from '@/mocks/stock-movements';
import { adjustQuantity, getQuantity } from '@/mocks/inventory-store';
import { delay } from '@/mocks/delay';

let movementDb: StockMovement[] = [...STOCK_MOVEMENTS];

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
  memo: string;
  createdBy: string;
}

export async function listStockMovements(query: StockMovementListQuery): Promise<StockMovement[]> {
  await delay();
  let items = [...movementDb];
  if (query.productId) items = items.filter((m) => m.productId === query.productId);
  if (query.warehouseId) items = items.filter((m) => m.warehouseId === query.warehouseId);
  if (query.type) items = items.filter((m) => m.type === query.type);
  return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function checkAvailableStock(productId: string, warehouseId: string): number {
  return getQuantity(productId, warehouseId);
}

export async function createStockMovement(input: CreateStockMovementInput): Promise<StockMovement> {
  await delay(400);
  const movement: StockMovement = { id: `sm-${Date.now()}`, createdAt: new Date('2026-06-19T09:00:00').toISOString(), ...input };
  movementDb = [movement, ...movementDb];
  adjustQuantity(input.productId, input.warehouseId, input.type === 'OUT' ? -input.quantity : input.quantity);
  return movement;
}
