CREATE TABLE IF NOT EXISTS external_analysis_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  created_by TEXT NOT NULL,
  role TEXT NOT NULL,
  dataset_type TEXT,
  parameters_json TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  result_summary_json TEXT,
  output_file_path TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
