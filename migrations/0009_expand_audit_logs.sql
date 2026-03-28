PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS audit_logs_new (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  actor_user_id TEXT,
  actor_role TEXT,

  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,

  target_student_id TEXT,
  target_student_ids_json TEXT,
  target_cohort_id TEXT,
  target_course_id TEXT,
  entity_owner_user_id TEXT,

  http_method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  route_pattern TEXT,
  query_params_json TEXT,

  status_code INTEGER NOT NULL,
  outcome TEXT NOT NULL,

  visible_record_count INTEGER,
  scope_basis TEXT,
  reason TEXT,
  
  change_summary_json TEXT,
  changed_fields_json TEXT,
  before_state_json TEXT,
  after_state_json TEXT,

  ip_hash TEXT,
  user_agent TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO audit_logs_new SELECT * FROM audit_logs;
DROP TABLE audit_logs;
ALTER TABLE audit_logs_new RENAME TO audit_logs;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at);

PRAGMA foreign_keys=on;
