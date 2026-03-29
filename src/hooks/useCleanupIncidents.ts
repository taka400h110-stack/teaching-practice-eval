import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export function useCleanupIncidents(fingerprint: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'cleanupIncidents', fingerprint],
    queryFn: async () => {
      if (!fingerprint) return [];
      const res = await apiFetch(`/api/admin/incidents/cleanup?fingerprint=${encodeURIComponent(fingerprint)}`);
      const data = await res.json();
      return data.incidents || [];
    },
    enabled: !!fingerprint,
  });

  const trigger = useMutation({
    mutationFn: async (severity: string) => {
      const res = await apiFetch('/api/admin/incidents/cleanup/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, severity })
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'cleanupIncidents', fingerprint] }),
  });

  const resolve = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiFetch('/api/admin/incidents/cleanup/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint, reason })
      });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'cleanupIncidents', fingerprint] }),
  });

  return { query, trigger, resolve };
}
