import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export function useCleanupAlertAssignee(fingerprint: string | null) {
  const queryClient = useQueryClient();

  const assign = useMutation({
    mutationFn: async (assigneeUserId: string | null) => {
      const res = await apiFetch('/api/admin/alerts/cleanup-failure/assign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fingerprint, assigneeUserId }) });
      const data = await res.json();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'cleanupFailureAlert'] });
    },
  });

  return { assign };
}
