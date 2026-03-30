import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { OperationalReadinessResponse } from '../types/operationalReadiness';

export function useOperationalReadiness() {
  return useQuery<OperationalReadinessResponse>({
    queryKey: ['admin', 'operationalReadiness'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/operational-readiness');
      if (!res.ok) throw new Error('Failed to fetch operational readiness');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}
