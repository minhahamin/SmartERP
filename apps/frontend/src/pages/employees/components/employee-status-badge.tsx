import { Badge } from '@/components/ui/badge';
import type { EmployeeStatus } from '@/mocks/employees';

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; variant: 'success' | 'warning' | 'default' }> = {
  ACTIVE: { label: '재직중', variant: 'success' },
  ON_LEAVE: { label: '휴직중', variant: 'warning' },
  RESIGNED: { label: '퇴사', variant: 'default' },
};

function EmployeeStatusBadge({ status }: { status: EmployeeStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

export { EmployeeStatusBadge };
