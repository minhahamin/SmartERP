import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { getDashboardSummary } from '@/pages/dashboard/api/get-dashboard-summary';

export function useDashboardSummary() {
  const role = useAuthStore((state) => state.user?.role ?? 'EMPLOYEE');

  return useQuery({
    queryKey: ['dashboard', 'summary', role],
    queryFn: () => getDashboardSummary(role),
  });
}
