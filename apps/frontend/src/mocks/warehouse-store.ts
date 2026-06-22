import { WAREHOUSES_SEED, type Warehouse } from '@/mocks/warehouses';
import { getInventorySnapshot } from '@/mocks/inventory-store';

/**
 * 재고 관리 / 입출고 관리 / 생산 관리 / 통계 / AI 챗봇이 모두 참조하는 창고 마스터의 단일 소스.
 * inventory-store.ts와 동일하게 동기 함수로 제공해, React 컴포넌트는 pages/inventory/api의
 * 비동기 래퍼(React Query)를 통해, AI 엔진·통계 같은 비-React 컨텍스트는 이 함수를 직접 호출한다.
 */
let warehouseStore: Warehouse[] = [...WAREHOUSES_SEED];

export function getWarehouses(): Warehouse[] {
  return warehouseStore;
}

export function getWarehouseById(id: string): Warehouse | undefined {
  return warehouseStore.find((w) => w.id === id);
}

export interface WarehouseInput {
  name: string;
  location: string;
}

export function createWarehouseRecord(input: WarehouseInput): Warehouse {
  const warehouse: Warehouse = { id: `wh-${Date.now()}`, ...input };
  warehouseStore = [...warehouseStore, warehouse];
  return warehouse;
}

export function updateWarehouseRecord(id: string, input: WarehouseInput): Warehouse {
  warehouseStore = warehouseStore.map((w) => (w.id === id ? { ...w, ...input } : w));
  const updated = getWarehouseById(id);
  if (!updated) throw new Error('창고를 찾을 수 없습니다.');
  return updated;
}

export function canDeleteWarehouse(id: string): boolean {
  return !getInventorySnapshot().some((record) => record.warehouseId === id && record.quantity > 0);
}

export function deleteWarehouseRecord(id: string): void {
  if (warehouseStore.length <= 1) {
    throw new Error('최소 1개의 창고는 유지되어야 합니다.');
  }
  if (!canDeleteWarehouse(id)) {
    throw new Error('해당 창고에 재고가 남아있어 삭제할 수 없습니다. 재고를 먼저 이동하거나 0으로 조정해주세요.');
  }
  warehouseStore = warehouseStore.filter((w) => w.id !== id);
}
