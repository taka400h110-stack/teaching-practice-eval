const fs = require('fs');

const sql = `
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  actor_user_id TEXT,
  actor_role TEXT,

  action TEXT NOT NULL CHECK (action IN ('read')),
  resource_type TEXT NOT NULL,
  resource_id TEXT,

  target_student_id TEXT,
  target_student_ids_json TEXT,
  target_cohort_id TEXT,
  target_course_id TEXT,

  http_method TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  route_pattern TEXT,
  query_params_json TEXT,

  status_code INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'forbidden', 'unauthorized', 'not_found', 'error')),

  visible_record_count INTEGER,
  scope_basis TEXT,
  reason TEXT,

  ip_hash TEXT,
  user_agent TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time ON audit_logs(actor_user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_student_time ON audit_logs(target_student_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_endpoint_time ON audit_logs(endpoint, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome_time ON audit_logs(outcome, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_time ON audit_logs(resource_type, occurred_at);
`;

const schemaPath = '/home/user/webapp/init_schema.sql';
let schema = fs.readFileSync(schemaPath, 'utf8');

// remove old audit_logs if any
schema = schema.replace(/CREATE TABLE IF NOT EXISTS audit_logs[\s\S]*?\n\);\n/g, '');

schema += '\n' + sql;
fs.writeFileSync(schemaPath, schema);
console.log('updated init_schema.sql with audit_logs');
