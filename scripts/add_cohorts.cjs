const fs = require('fs');
const sql = `
CREATE TABLE IF NOT EXISTS cohorts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS cohort_memberships (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cohort_id) REFERENCES cohorts(id),
  FOREIGN KEY (student_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_cohort ON cohort_memberships(cohort_id);
CREATE INDEX IF NOT EXISTS idx_cohort_members_student ON cohort_memberships(student_id);
`;

const schemaFile = '/home/user/webapp/init_schema.sql';
let content = fs.readFileSync(schemaFile, 'utf8');
if (!content.includes('cohort_memberships')) {
  fs.writeFileSync(schemaFile, content + '\n' + sql);
  console.log('updated init_schema.sql');
}
