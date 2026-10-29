import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { downloadMonthlyReport } from '@/pages/statistics/api/statistics-api';
import { toast } from '@/stores/toast-store';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { ChartCard } from '@/pages/statistics/components/chart-card';
import { useHrStats, useInventoryStats, useMyStats, useSalesStats } from '@/pages/statistics/hooks/use-statistics';
import { useAuthStore } from '@/stores/auth-store';

const PIE_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

/** API는 매출을 원 단위로 내려준다 — 축 눈금은 백만 원 단위로 줄여 표시한다 */
const formatMillion = (won: number) => `${Number((won / 1_000_000).toFixed(1))}백만`;
const formatWon = (won: unknown) => `₩${Number(won).toLocaleString()}`;

/** 지난달(KST) 연·월. 리포트는 마감된 달 기준으로 받는 것이 자연스럽다 */
function lastMonth(): { year: number; month: number } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const month = kst.getUTCMonth(); // 0-based 이번 달 == 1-based 지난달
  return month === 0 ? { year: kst.getUTCFullYear() - 1, month: 12 } : { year: kst.getUTCFullYear(), month };
}

function MonthlyReportButton() {
  const [loading, setLoading] = useState(false);
  const { year, month } = lastMonth();

  async function download() {
    setLoading(true);
    try {
      await downloadMonthlyReport(year, month);
    } catch {
      toast({ title: '리포트를 내려받지 못했습니다. 잠시 후 다시 시도해주세요.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={download} disabled={loading}>
      <FileDown className="size-4" />
      {loading ? '만드는 중…' : `${year}년 ${month}월 리포트 PDF`}
    </Button>
  );
}

function StatisticsPage() {
  const role = useAuthStore((state) => state.user?.role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="통계 분석"
        description="매출/재고/인사 데이터를 시각화하고 기간별로 비교합니다."
        actions={role === 'ADMIN' ? <MonthlyReportButton /> : undefined}
      />

      {role === 'EMPLOYEE' ? (
        <EmployeeStatsView />
      ) : role === 'SALES_MANAGER' ? (
        <SalesStatsView />
      ) : role === 'HR_MANAGER' ? (
        <HrStatsView />
      ) : (
        <Tabs defaultValue="sales">
          <TabsList>
            <TabsTrigger value="sales">매출</TabsTrigger>
            <TabsTrigger value="inventory">재고</TabsTrigger>
            <TabsTrigger value="hr">인사</TabsTrigger>
          </TabsList>
          <TabsContent value="sales">
            <SalesStatsView />
          </TabsContent>
          <TabsContent value="inventory">
            <InventoryStatsView />
          </TabsContent>
          <TabsContent value="hr">
            <HrStatsView />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SalesStatsView() {
  const { data, isLoading } = useSalesStats();
  if (isLoading || !data) return <ChartGridSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="월별 매출 추이" data={data.monthlyTrend} filename="monthly-sales.csv">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 256 }}>
          <LineChart data={data.monthlyTrend}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tickLine={false} axisLine={false} width={48} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatMillion} />
            <Tooltip formatter={(value) => [formatWon(value), '매출']} />
            <Line type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="거래처별 매출 Top 5" data={data.byPartner} filename="sales-by-partner.csv">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 256 }}>
          <BarChart data={data.byPartner} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={formatMillion} />
            <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={80} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip formatter={(value) => [formatWon(value), '매출']} />
            <Bar dataKey="value" fill="#ec4899" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function InventoryStatsView() {
  const { data, isLoading } = useInventoryStats();
  if (isLoading || !data) return <ChartGridSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="창고별 재고 수량" data={data.byWarehouse} filename="inventory-by-warehouse.csv">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 256 }}>
          <BarChart data={data.byWarehouse}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="분류별 재고 비중" data={data.byCategory} filename="inventory-by-category.csv">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 256 }}>
          <PieChart>
            <Pie data={data.byCategory} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.byCategory.map((entry, index) => (
                <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function HrStatsView() {
  const { data, isLoading } = useHrStats();
  if (isLoading || !data) return <ChartGridSkeleton />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="부서별 인원" data={data.byDepartment} filename="headcount-by-department.csv">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 256 }}>
          <BarChart data={data.byDepartment}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="역할별 인원 분포" data={data.byRole} filename="headcount-by-role.csv">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 256 }}>
          <PieChart>
            <Pie data={data.byRole} dataKey="value" nameKey="label" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.byRole.map((entry, index) => (
                <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function EmployeeStatsView() {
  const { data, isLoading } = useMyStats();
  if (isLoading || !data) return <ChartGridSkeleton />;
  const { attendance, leave } = data;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard title="최근 근무 시간(시간)" data={attendance} filename="my-attendance.csv">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height: 256 }}>
          <BarChart data={attendance}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tickLine={false} axisLine={false} width={32} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip />
            <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <Card className="flex flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="text-sm text-muted-foreground">내 연차 사용 현황</p>
        <p className="text-3xl font-bold tabular-nums text-foreground">{leave.remaining}일 남음</p>
        <p className="text-xs text-muted-foreground">총 {leave.total}일 중 {leave.used}일 사용</p>
      </Card>
    </div>
  );
}

function ChartGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
    </div>
  );
}

export { StatisticsPage };
