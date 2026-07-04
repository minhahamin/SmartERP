import { apiClient, type ApiSuccess } from '@/lib/api/client';

export interface ChartPoint {
  label: string;
  value: number;
}

export interface SalesStats {
  monthlyTrend: ChartPoint[];
  byPartner: ChartPoint[];
}

export interface InventoryStats {
  byWarehouse: ChartPoint[];
  byCategory: ChartPoint[];
}

export interface HrStats {
  byDepartment: ChartPoint[];
  byRole: ChartPoint[];
}

export interface MyStats {
  attendance: ChartPoint[];
  leave: { total: number; used: number; remaining: number };
}

export async function getSalesStats(): Promise<SalesStats> {
  const { data } = await apiClient.get<ApiSuccess<SalesStats>>('/statistics/sales');
  return data.data;
}

export async function getInventoryStats(): Promise<InventoryStats> {
  const { data } = await apiClient.get<ApiSuccess<InventoryStats>>('/statistics/inventory');
  return data.data;
}

export async function getHrStats(): Promise<HrStats> {
  const { data } = await apiClient.get<ApiSuccess<HrStats>>('/statistics/hr');
  return data.data;
}

export async function getMyStats(): Promise<MyStats> {
  const { data } = await apiClient.get<ApiSuccess<MyStats>>('/statistics/me');
  return data.data;
}
