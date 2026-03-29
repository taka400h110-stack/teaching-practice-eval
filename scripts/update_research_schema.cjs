const fs = require('fs');

const sql = `
CREATE TABLE IF NOT EXISTS research_scope_assignments (
  id TEXT PRIMARY KEY,
  researcher_user_id TEXT NOT NULL,

  assignment_level TEXT NOT NULL CHECK (
    assignment_level IN ('course', 'cohort', 'student', 'dataset')
  ),

  course_id TEXT,
  cohort_id TEXT,
  student_id TEXT,
  dataset_type TEXT,

  anonymization_level TEXT NOT NULL DEFAULT 'pseudonymized' CHECK (
    anonymization_level IN ('raw', 'pseudonymized', 'aggregated')
  ),

  can_read_journals INTEGER NOT NULL DEFAULT 1,
  can_read_self_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_ai_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_human_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_growth INTEGER NOT NULL DEFAULT 1,
  can_read_goals INTEGER NOT NULL DEFAULT 1,
  can_read_chat INTEGER NOT NULL DEFAULT 0,
  can_read_exports INTEGER NOT NULL DEFAULT 0,
  can_run_statistics INTEGER NOT NULL DEFAULT 1,
  can_view_longitudinal INTEGER NOT NULL DEFAULT 1,
  can_view_reliability INTEGER NOT NULL DEFAULT 1,

  is_active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (researcher_user_id) REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_research_scope_user_active ON research_scope_assignments(researcher_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_research_scope_course ON research_scope_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_research_scope_cohort ON research_scope_assignments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_research_scope_student ON research_scope_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_research_scope_dataset ON research_scope_assignments(dataset_type);
CREATE INDEX IF NOT EXISTS idx_research_scope_level ON research_scope_assignments(assignment_level, is_active);
`;

const schemaPath = '/home/user/webapp/init_schema.sql';
let schema = fs.readFileSync(schemaPath, 'utf8');

// remove old if exists
schema = schema.replace(/CREATE TABLE IF NOT EXISTS research_scope_assignments[\s\S]*?\n\);\n/g, '');

schema += '\n' + sql;
fs.writeFileSync(schemaPath, schema);
console.log('updated init_schema.sql with research_scope_assignments');
