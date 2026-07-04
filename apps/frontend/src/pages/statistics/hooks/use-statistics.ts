import { useQuery } from '@tanstack/react-query';
import { getHrStats, getInventoryStats, getMyStats, getSalesStats } from '@/pages/statistics/api/statistics-api';

export function useSalesStats() {
  return useQuery({ queryKey: ['statistics', 'sales'], queryFn: getSalesStats });
}

export function useInventoryStats() {
  return useQuery({ queryKey: ['statistics', 'inventory'], queryFn: getInventoryStats });
}

export function useHrStats() {
  return useQuery({ queryKey: ['statistics', 'hr'], queryFn: getHrStats });
}

export function useMyStats() {
  return useQuery({ queryKey: ['statistics', 'me'], queryFn: getMyStats });
}
