import { Wallet, Handshake, AlertTriangle, Users, CalendarClock, Factory, CalendarDays, type LucideIcon } from 'lucide-react';
import { StatCard, type StatCardProps } from '@/components/common/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardKpi } from '@/pages/dashboard/api/get-dashboard-summary';

const KPI_ICON: Record<DashboardKpi['key'], LucideIcon> = {
  revenue: Wallet,
  partners: Handshake,
  lowStock: AlertTriangle,
  headcount: Users,
  pendingLeave: CalendarClock,
  delayedProduction: Factory,
  unpaidPayroll: Wallet,
  myLeaveBalance: CalendarDays,
};

const KPI_TONE: Record<DashboardKpi['key'], StatCardProps['iconTone']> = {
  revenue: 'primary',
  partners: 'primary',
  lowStock: 'danger',
  headcount: 'info',
  pendingLeave: 'warning',
  delayedProduction: 'danger',
  unpaidPayroll: 'info',
  myLeaveBalance: 'success',
};

function KpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <StatCard
          key={kpi.key}
          label={kpi.label}
          value={kpi.value}
          icon={KPI_ICON[kpi.key]}
          iconTone={KPI_TONE[kpi.key]}
          trend={kpi.trend}
          helperText={kpi.helperText}
        />
      ))}
    </div>
  );
}

function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[104px] rounded-md" />
      ))}
    </div>
  );
}

export { KpiGrid, KpiGridSkeleton };
