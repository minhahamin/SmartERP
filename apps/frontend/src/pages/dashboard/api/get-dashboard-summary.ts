import type { RoleName } from '@/types/auth';

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

const SALES_TREND: SalesTrendPoint[] = [
  { month: '1월', revenue: 312 },
  { month: '2월', revenue: 298 },
  { month: '3월', revenue: 355 },
  { month: '4월', revenue: 340 },
  { month: '5월', revenue: 412 },
  { month: '6월', revenue: 482 },
];

const LOW_STOCK_PRODUCTS: LowStockProduct[] = [
  { id: 'p-1', name: '스테인리스 볼트 M6', quantity: 42, safetyStock: 100, warehouseName: '1창고' },
  { id: 'p-2', name: '알루미늄 브라켓', quantity: 58, safetyStock: 100, warehouseName: '1창고' },
  { id: 'p-3', name: '패킹박스 L', quantity: 15, safetyStock: 50, warehouseName: '2창고' },
  { id: 'p-4', name: 'PVC 파이프 20A', quantity: 8, safetyStock: 30, warehouseName: '2창고' },
];

const RECENT_ANNOUNCEMENTS: RecentAnnouncement[] = [
  { id: 'a-1', title: '2026년 하반기 근무제도 안내', scope: '전사', pinned: true, publishedAt: '2026-06-15' },
  { id: 'a-2', title: '7월 거래처 정기점검 일정 공유', scope: '영업팀', pinned: false, publishedAt: '2026-06-12' },
  { id: 'a-3', title: '사내 문서 시스템 업데이트 안내', scope: '전사', pinned: false, publishedAt: '2026-06-10' },
];

const KPI_BY_ROLE: Record<RoleName, DashboardKpi[]> = {
  ADMIN: [
    { key: 'revenue', label: '이번 달 매출', value: '₩482,300,000', trend: { direction: 'up', value: '12.4%' } },
    { key: 'headcount', label: '재직 인원', value: '128명', trend: { direction: 'up', value: '3명' } },
    { key: 'lowStock', label: '재고 경고', value: '4건', helperText: '즉시 확인 필요' },
    { key: 'delayedProduction', label: '생산 지연', value: '2건', helperText: '생산 관리에서 확인' },
  ],
  HR_MANAGER: [
    { key: 'headcount', label: '재직 인원', value: '128명', trend: { direction: 'up', value: '3명' } },
    { key: 'pendingLeave', label: '휴가 승인 대기', value: '5건', helperText: '결재 필요' },
    { key: 'unpaidPayroll', label: '이번 달 급여 미확정', value: '3건', helperText: '06월 급여' },
    { key: 'delayedProduction', label: '생산 지연(참고)', value: '2건' },
  ],
  SALES_MANAGER: [
    { key: 'revenue', label: '이번 달 매출', value: '₩482,300,000', trend: { direction: 'up', value: '12.4%' } },
    { key: 'partners', label: '거래처 수', value: '128곳', trend: { direction: 'up', value: '3곳' } },
    { key: 'lowStock', label: '재고 경고', value: '4건', helperText: '즉시 확인 필요' },
    { key: 'unpaidPayroll', label: '미확정 급여', value: '0건', helperText: '모두 완료' },
  ],
  EMPLOYEE: [
    { key: 'myLeaveBalance', label: '내 연차 잔여', value: '8.5일' },
    { key: 'pendingLeave', label: '내 휴가 신청', value: '1건', helperText: '승인 대기' },
    { key: 'delayedProduction', label: '내 생산 작업', value: '1건', helperText: '지연' },
    { key: 'unpaidPayroll', label: '이번 달 급여', value: '확정', helperText: '06월' },
  ],
};

/**
 * TODO(backend 연동): GET /api/v1/dashboard/summary 로 교체.
 * 현재는 docs/08-api-design.md 응답 envelope과 동일한 형태의 데이터를 모킹하여,
 * 추후 axios 호출로 치환할 때 컴포넌트/훅 시그니처가 바뀌지 않도록 설계했다.
 */
export async function getDashboardSummary(role: RoleName): Promise<DashboardSummary> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    kpis: KPI_BY_ROLE[role],
    salesTrend: SALES_TREND,
    lowStockProducts: LOW_STOCK_PRODUCTS,
    recentAnnouncements: RECENT_ANNOUNCEMENTS,
  };
}
