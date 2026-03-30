import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export function useCleanupAlertEscalations(fingerprint: string | null) {
  return useQuery({
    queryKey: ['admin', 'cleanupAlertEscalations', fingerprint],
    queryFn: async () => {
      if (!fingerprint) return null;
      const res = await apiFetch(`/api/admin/alerts/cleanup-failure/escalations?fingerprint=${encodeURIComponent(fingerprint)}`);
      const data = await res.json() as any;
      return data.escalations || [];
    },
    enabled: !!fingerprint,
  });
}
