import { PRODUCTION_ORDERS, type ProductionOrder, type ProductionStatus } from '@/mocks/production-orders';
import { adjustQuantity } from '@/mocks/inventory-store';
import { getWarehouses } from '@/mocks/warehouse-store';
import { delay } from '@/mocks/delay';

let productionDb: ProductionOrder[] = [...PRODUCTION_ORDERS];

export interface CreateProductionOrderInput {
  productId: string;
  plannedQty: number;
  lineName: string;
  startDate: string;
  dueDate: string;
  managerId: string;
}

export async function listProductionOrders(): Promise<ProductionOrder[]> {
  await delay();
  return productionDb;
}

export async function createProductionOrder(input: CreateProductionOrderInput): Promise<ProductionOrder> {
  await delay(400);
  const order: ProductionOrder = {
    id: `po-${Date.now()}`,
    orderNo: `PO-2026-${String(productionDb.length + 20).padStart(3, '0')}`,
    producedQty: 0,
    status: 'PLANNED',
    ...input,
  };
  productionDb = [...productionDb, order];
  return order;
}

export async function updateProductionStatus(id: string, status: ProductionStatus): Promise<ProductionOrder> {
  await delay(400);
  productionDb = productionDb.map((p) => {
    if (p.id !== id) return p;
    const producedQty = status === 'COMPLETED' ? p.plannedQty : p.producedQty;
    return { ...p, status, producedQty };
  });
  const updated = productionDb.find((p) => p.id === id);
  if (!updated) throw new Error('생산 오더를 찾을 수 없습니다.');

  if (status === 'COMPLETED') {
    const defaultWarehouseId = getWarehouses()[0]?.id;
    if (defaultWarehouseId) adjustQuantity(updated.productId, defaultWarehouseId, updated.plannedQty);
  }
  return updated;
}
