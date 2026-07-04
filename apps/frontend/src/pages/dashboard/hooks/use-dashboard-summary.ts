import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '@/pages/dashboard/api/get-dashboard-summary';

export function useDashboardSummary() {
  return useQuery({ queryKey: ['dashboard', 'summary'], queryFn: getDashboardSummary });
}
