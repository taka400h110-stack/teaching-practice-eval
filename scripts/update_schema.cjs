const fs = require('fs');

const sql = `
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id TEXT PRIMARY KEY,
  teacher_user_id TEXT NOT NULL,
  assignment_level TEXT NOT NULL CHECK (assignment_level IN ('course', 'cohort', 'student')),
  course_id TEXT,
  cohort_id TEXT,
  student_id TEXT,
  can_read_students INTEGER NOT NULL DEFAULT 1,
  can_read_journals INTEGER NOT NULL DEFAULT 1,
  can_read_self_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_ai_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_human_evaluations INTEGER NOT NULL DEFAULT 1,
  can_write_human_evaluations INTEGER NOT NULL DEFAULT 1,
  can_read_goals INTEGER NOT NULL DEFAULT 1,
  can_read_growth INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (teacher_user_id) REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_course ON teacher_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_cohort ON teacher_assignments(cohort_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_student ON teacher_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_level ON teacher_assignments(assignment_level, is_active);
`;

const schemaPath = '/home/user/webapp/init_schema.sql';
let schema = fs.readFileSync(schemaPath, 'utf8');

// remove old teacher_assignments
schema = schema.replace(/CREATE TABLE IF NOT EXISTS teacher_assignments[\s\S]*?\n\);\n/g, '');

schema += '\n' + sql;
fs.writeFileSync(schemaPath, schema);
console.log('updated init_schema.sql');
