const fs = require('fs');

const sql = `
CREATE TABLE IF NOT EXISTS dataset_export_requests (
  id TEXT PRIMARY KEY,
  requester_user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  request_type TEXT NOT NULL, -- export, download, raw_access
  dataset_type TEXT NOT NULL, -- journals, evaluations, etc.
  scope_level TEXT NOT NULL, -- course, cohort, student, all
  course_id TEXT,
  cohort_id TEXT,
  student_id TEXT,
  requested_anonymization_level TEXT NOT NULL, -- aggregated, pseudonymized, raw
  approved_anonymization_level TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, generated, expired
  purpose TEXT NOT NULL,
  justification TEXT,
  field_filters_json TEXT,
  approved_by TEXT,
  approved_at DATETIME,
  rejected_reason TEXT,
  max_download_count INTEGER DEFAULT 1,
  current_download_count INTEGER DEFAULT 0,
  export_file_path TEXT,
  file_hash TEXT,
  row_count INTEGER,
  summary_json TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_user_id) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_export_req_requester_status ON dataset_export_requests(requester_user_id, status);
CREATE INDEX IF NOT EXISTS idx_export_req_dataset_type ON dataset_export_requests(dataset_type);
CREATE INDEX IF NOT EXISTS idx_export_req_status_created ON dataset_export_requests(status, created_at);

CREATE TABLE IF NOT EXISTS dataset_download_tokens (
  id TEXT PRIMARY KEY,
  export_request_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  issued_to_user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  is_revoked BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (export_request_id) REFERENCES dataset_export_requests(id),
  FOREIGN KEY (issued_to_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_download_tokens_export ON dataset_download_tokens(export_request_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_hash ON dataset_download_tokens(token_hash);
`;

const schemaFile = '/home/user/webapp/init_schema.sql';
let content = fs.readFileSync(schemaFile, 'utf8');
if (!content.includes('dataset_export_requests')) {
  fs.writeFileSync(schemaFile, content + '\n' + sql);
  console.log('updated init_schema.sql');
} else {
  console.log('schema already contains export tables');
}
