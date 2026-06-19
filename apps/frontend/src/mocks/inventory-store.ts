import { INVENTORY, type InventoryRecord } from '@/mocks/products';

/**
 * 재고 관리 / 입출고 관리 두 모듈이 공유하는 단일 가변 상태.
 * 실제 백엔드라면 PostgreSQL 트랜잭션으로 처리될 부분을 메모리 배열로 모사한다.
 */
let inventoryStore: InventoryRecord[] = [...INVENTORY];

export function getInventorySnapshot(): InventoryRecord[] {
  return inventoryStore;
}

export function getQuantity(productId: string, warehouseId: string): number {
  return inventoryStore.find((i) => i.productId === productId && i.warehouseId === warehouseId)?.quantity ?? 0;
}

export function adjustQuantity(productId: string, warehouseId: string, delta: number): void {
  const existing = inventoryStore.find((i) => i.productId === productId && i.warehouseId === warehouseId);
  if (existing) {
    inventoryStore = inventoryStore.map((i) =>
      i.productId === productId && i.warehouseId === warehouseId ? { ...i, quantity: i.quantity + delta } : i,
    );
  } else {
    inventoryStore = [...inventoryStore, { productId, warehouseId, quantity: Math.max(delta, 0) }];
  }
}

export function setQuantity(productId: string, warehouseId: string, quantity: number): void {
  const existing = inventoryStore.find((i) => i.productId === productId && i.warehouseId === warehouseId);
  if (existing) {
    inventoryStore = inventoryStore.map((i) => (i.productId === productId && i.warehouseId === warehouseId ? { ...i, quantity } : i));
  } else {
    inventoryStore = [...inventoryStore, { productId, warehouseId, quantity }];
  }
}
