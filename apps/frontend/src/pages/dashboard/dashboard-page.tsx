import { useState } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardSummary } from '@/pages/dashboard/hooks/use-dashboard-summary';
import { KpiGrid, KpiGridSkeleton } from '@/pages/dashboard/components/kpi-grid';
import { SalesTrendChart, SalesTrendChartSkeleton } from '@/pages/dashboard/components/sales-trend-chart';
import { LowStockList, LowStockListSkeleton } from '@/pages/dashboard/components/low-stock-list';
import { RecentAnnouncements, RecentAnnouncementsSkeleton } from '@/pages/dashboard/components/recent-announcements';

const PERIOD_OPTIONS = ['이번 달', '지난 달', '이번 분기'] as const;

function DashboardPage() {
  // TODO(backend 연동): 기간 변경 시 GET /dashboard/summary?period= 쿼리로 재요청하도록 연결
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>('이번 달');
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="대시보드"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                {period}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PERIOD_OPTIONS.map((option) => (
                <DropdownMenuItem key={option} onSelect={() => setPeriod(option)}>
                  {option}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {isError && (
        <EmptyState
          icon={RotateCcw}
          title="대시보드 데이터를 불러오지 못했습니다"
          description="잠시 후 다시 시도해주세요."
          action={
            <Button size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          }
        />
      )}

      {!isError && (isLoading || !data) && (
        <div className="flex flex-col gap-6">
          <KpiGridSkeleton />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SalesTrendChartSkeleton />
            </div>
            <LowStockListSkeleton />
          </div>
          <RecentAnnouncementsSkeleton />
        </div>
      )}

      {!isError && !isLoading && data && (
        <div className="flex flex-col gap-6">
          <KpiGrid kpis={data.kpis} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SalesTrendChart data={data.salesTrend} />
            </div>
            <LowStockList products={data.lowStockProducts} />
          </div>

          <RecentAnnouncements announcements={data.recentAnnouncements} />
        </div>
      )}
    </div>
  );
}

export { DashboardPage };
