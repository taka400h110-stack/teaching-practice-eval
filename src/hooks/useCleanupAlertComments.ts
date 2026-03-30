import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export function useCleanupAlertComments(fingerprint: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'cleanupAlertComments', fingerprint],
    queryFn: async () => {
      if (!fingerprint) return [];
      const res = await apiFetch(`/api/admin/alerts/cleanup-failure/comments?fingerprint=${encodeURIComponent(fingerprint)}`);
      const data = await res.json() as any;
      return data.comments;
    },
    enabled: !!fingerprint,
  });

  const addComment = useMutation({
    mutationFn: async (comment: string) => {
      const res = await apiFetch('/api/admin/alerts/cleanup-failure/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fingerprint, comment }) });
      const data = await res.json() as any;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'cleanupAlertComments', fingerprint] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'cleanupFailureAlert'] });
    },
  });

  return { ...query, addComment };
}
