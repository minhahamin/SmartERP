import { apiClient, type ApiSuccess } from '@/lib/api/client';

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  managerId: string | null;
}

export interface WarehouseInput {
  name: string;
  location?: string;
}

export async function listWarehouses(): Promise<Warehouse[]> {
  const { data } = await apiClient.get<ApiSuccess<Warehouse[]>>('/warehouses');
  return data.data;
}

export async function createWarehouse(input: WarehouseInput): Promise<Warehouse> {
  const { data } = await apiClient.post<ApiSuccess<Warehouse>>('/warehouses', input);
  return data.data;
}

export async function updateWarehouse(id: string, input: WarehouseInput): Promise<Warehouse> {
  const { data } = await apiClient.patch<ApiSuccess<Warehouse>>(`/warehouses/${id}`, input);
  return data.data;
}

export async function removeWarehouse(id: string): Promise<void> {
  await apiClient.delete(`/warehouses/${id}`);
}
