import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SalesTrendPoint } from '@/pages/dashboard/api/get-dashboard-summary';

function SalesTrendChart({ data }: { data: SalesTrendPoint[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>매출 추이 (최근 6개월)</CardTitle>
      </CardHeader>
      <div className="h-64 px-2 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ec4899" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#ec4899" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={48}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={(value: number) => `${value}백만`}
            />
            <Tooltip
              cursor={{ stroke: '#ec4899', strokeWidth: 1, strokeDasharray: '4 4' }}
              formatter={(value) => [`₩${Number(value).toLocaleString()}백만`, '매출']}
              contentStyle={{ borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} fill="url(#salesGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function SalesTrendChartSkeleton() {
  return <Skeleton className="h-[268px] rounded-md" />;
}

export { SalesTrendChart, SalesTrendChartSkeleton };
