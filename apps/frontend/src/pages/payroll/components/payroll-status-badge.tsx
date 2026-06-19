import { Badge } from '@/components/ui/badge';
import type { PayrollStatus } from '@/mocks/payroll';

const CONFIG: Record<PayrollStatus, { label: string; variant: 'default' | 'info' | 'success' }> = {
  DRAFT: { label: 'DRAFT', variant: 'default' },
  CONFIRMED: { label: 'CONFIRMED', variant: 'info' },
  PAID: { label: 'PAID', variant: 'success' },
};

function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
  const config = CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export { PayrollStatusBadge };
