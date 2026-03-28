import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

export type ExportRequestStatus = 'pending'|'approved'|'generated'|'completed'|'rejected'|'expired'|'revoked';
export type ExportRequestType = 'export'|'download'|'raw_access';
export type AnonymizationLevel = 'raw'|'pseudonymized'|'aggregated';

export interface ExportRequest {
  id: string;
  requester_user_id: string;
  requester_role: string;
  request_type: ExportRequestType;
  dataset_type: string;
  scope_level: string;
  course_id?: string | null;
  cohort_id?: string | null;
  student_id?: string | null;
  requested_anonymization_level: AnonymizationLevel;
  approved_anonymization_level?: AnonymizationLevel | null;
  status: ExportRequestStatus;
  purpose?: string | null;
  justification?: string | null;
  requested_fields_json?: string | null;
  created_at: string;
  approved_at?: string | null;
  expires_at?: string | null;
  max_download_count: number;
  current_download_count: number;
  export_row_count?: number | null;
  export_file_size_bytes?: number | null;
  last_downloaded_at?: string | null;
  rejection_reason?: string | null;
}

export function useExportRequests() {
  return useQuery<ExportRequest[]>({
    queryKey: ['exportRequests'],
    queryFn: async () => {
      const res = await apiFetch('/api/data/exports/requests');
      if (!res.ok) throw new Error('Failed to fetch export requests');
      const data: any = await res.json();
      return data.requests;
    },
  });
}

export function useCreateExportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExportRequest>) => {
      const res = await apiFetch('/api/data/exports/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create request');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exportRequests'] }),
  });
}

export function useApproveExportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
      const res = await apiFetch(`/api/data/exports/requests/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to approve request');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exportRequests'] }),
  });
}

export function useRejectExportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string, reason: string }) => {
      const res = await apiFetch(`/api/data/exports/requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error('Failed to reject request');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exportRequests'] }),
  });
}

export function useRevokeExportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/data/exports/requests/${id}/revoke`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to revoke request');
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exportRequests'] }),
  });
}

export function useGenerateExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/data/exports/requests/${id}/generate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData: any = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate export');
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exportRequests'] }),
  });
}

export function useIssueDownloadToken() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/data/exports/requests/${id}/download-token`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err: any = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to issue download token');
      }
      return res.json();
    },
  });
}
