import { triggerBlobDownload } from '@/lib/api/download';
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

/** 월간 경영 리포트(관리자 전용)를 PDF로 내려받는다. 해당 월 리포트가 없으면 서버가 그 자리에서 만든다 */
export async function downloadMonthlyReport(year: number, month: number): Promise<void> {
  const { data } = await apiClient.get('/reports/monthly/pdf', { params: { year, month }, responseType: 'blob' });
  triggerBlobDownload(data as Blob, `monthly-report-${year}-${String(month).padStart(2, '0')}.pdf`);
}
