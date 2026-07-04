import { apiClient, type ApiSuccess } from '@/lib/api/client';

export type ProductionStatus = 'PLANNED' | 'IN_PROGRESS' | 'DELAYED' | 'COMPLETED' | 'CANCELLED';

export interface ProductionOrder {
  id: string;
  orderNo: string;
  productId: string;
  productName: string;
  unit: string;
  plannedQty: number;
  producedQty: number;
  status: ProductionStatus;
  lineName: string | null;
  startDate: string;
  dueDate: string;
  managerId: string | null;
  warehouseId: string | null;
}

interface RawProductionOrder {
  id: string;
  orderNo: string;
  productId: string;
  plannedQty: number;
  producedQty: number;
  status: ProductionStatus;
  lineName: string | null;
  startDate: string;
  dueDate: string;
  managerId: string | null;
  warehouseId: string | null;
  product: { name: string; unit: string };
}

function toProductionOrder(raw: RawProductionOrder): ProductionOrder {
  return {
    id: raw.id,
    orderNo: raw.orderNo,
    productId: raw.productId,
    productName: raw.product.name,
    unit: raw.product.unit,
    plannedQty: raw.plannedQty,
    producedQty: raw.producedQty,
    status: raw.status,
    lineName: raw.lineName,
    startDate: raw.startDate,
    dueDate: raw.dueDate,
    managerId: raw.managerId,
    warehouseId: raw.warehouseId,
  };
}

export async function listProductionOrders(): Promise<ProductionOrder[]> {
  const { data } = await apiClient.get<ApiSuccess<RawProductionOrder[]>>('/production-orders', {
    params: { page: 1, limit: 100 },
  });
  return data.data.map(toProductionOrder);
}

export interface CreateProductionOrderInput {
  productId: string;
  plannedQty: number;
  lineName?: string;
  startDate: string;
  dueDate: string;
  warehouseId: string;
}

export async function createProductionOrder(input: CreateProductionOrderInput) {
  const { data } = await apiClient.post<ApiSuccess<{ id: string }>>('/production-orders', input);
  return data.data;
}

export async function updateProductionStatus(id: string, status: ProductionStatus) {
  const { data } = await apiClient.patch<ApiSuccess<{ id: string }>>(`/production-orders/${id}/status`, { status });
  return data.data;
}
