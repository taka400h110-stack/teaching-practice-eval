export type ExportRequestStatus =
  | 'pending'
  | 'approved'
  | 'generated'
  | 'completed'
  | 'rejected'
  | 'expired'
  | 'revoked';

export type ExportRequestType =
  | 'export'
  | 'download'
  | 'raw_access';

export type AnonymizationLevel =
  | 'raw'
  | 'pseudonymized'
  | 'aggregated';

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
  filter_params_json?: string | null;
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
