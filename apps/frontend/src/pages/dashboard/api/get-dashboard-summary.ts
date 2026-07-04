import { apiClient, type ApiSuccess } from '@/lib/api/client';

export interface DashboardKpi {
  key: 'revenue' | 'partners' | 'lowStock' | 'headcount' | 'pendingLeave' | 'delayedProduction' | 'unpaidPayroll' | 'myLeaveBalance';
  label: string;
  value: string;
  trend?: { direction: 'up' | 'down'; value: string };
  helperText?: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  quantity: number;
  safetyStock: number;
  warehouseName: string;
}

export interface SalesTrendPoint {
  month: string;
  revenue: number;
}

export interface RecentAnnouncement {
  id: string;
  title: string;
  scope: string;
  pinned: boolean;
  publishedAt: string;
}

export interface DashboardSummary {
  kpis: DashboardKpi[];
  salesTrend: SalesTrendPoint[];
  lowStockProducts: LowStockProduct[];
  recentAnnouncements: RecentAnnouncement[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<ApiSuccess<DashboardSummary>>('/statistics/dashboard');
  return data.data;
}
