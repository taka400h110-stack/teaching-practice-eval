const fs = require('fs');

const sql = `
-- Adding Write Audit columns
-- Note: SQLite does not support ALTER TABLE ADD COLUMN multiple times easily,
-- but D1 supports basic ADD COLUMN. Since this is an init script, we can just replace the whole table definition if needed, or just ALTER if we were doing a migration.
-- Since it's init_schema.sql, let's just rewrite the CREATE TABLE to include new fields and update the CHECK constraint.
`;

const schemaPath = '/home/user/webapp/init_schema.sql';
let schema = fs.readFileSync(schemaPath, 'utf8');

// Replace the old audit_logs table creation entirely
schema = schema.replace(/CREATE TABLE IF NOT EXISTS audit_logs \([\s\S]*?\n\);\n/, `
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  request_id TEXT,
  occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  actor_user_id TEXT,
  actor_role TEXT,

  action TEXT NOT NULL CHECK (action IN ('read', 'create', 'update', 'delete')),
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
  outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'forbidden', 'unauthorized', 'not_found', 'error')),

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
`);

fs.writeFileSync(schemaPath, schema);
console.log('updated init_schema.sql with write audit columns');
