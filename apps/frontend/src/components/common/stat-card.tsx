import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    direction: 'up' | 'down';
    value: string;
    tone?: 'positive' | 'negative' | 'neutral';
  };
  helperText?: string;
  iconTone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const ICON_TONE_CLASSES: Record<NonNullable<StatCardProps['iconTone']>, string> = {
  primary: 'bg-primary-soft text-primary-soft-foreground',
  success: 'bg-success-soft text-success-foreground',
  warning: 'bg-warning-soft text-warning-foreground',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-info-soft text-info-foreground',
};

function StatCard({ label, value, icon: Icon, trend, helperText, iconTone = 'primary' }: StatCardProps) {
  const trendTone = trend?.tone ?? (trend?.direction === 'up' ? 'positive' : 'negative');
  const trendColor =
    trendTone === 'positive' ? 'text-success-foreground' : trendTone === 'negative' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</span>
        </div>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', ICON_TONE_CLASSES[iconTone])}>
          <Icon className="size-[18px]" />
        </div>
      </div>

      {(trend || helperText) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {trend && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', trendColor)}>
              {trend.direction === 'up' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
              {trend.value}
            </span>
          )}
          {helperText && <span className="text-muted-foreground">{helperText}</span>}
        </div>
      )}
    </Card>
  );
}

export { StatCard };
