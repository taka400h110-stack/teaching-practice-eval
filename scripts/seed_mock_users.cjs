const { execSync } = require('child_process');
const sql = `
INSERT OR IGNORE INTO users (id, name, email, role, created_at, updated_at) VALUES 
('admin-1', 'Admin', 'admin@test.com', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('researcher-1', 'Researcher', 'researcher@test.com', 'researcher', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('student-1', 'Student', 'student@test.com', 'student', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
`;
try {
  execSync(`npx wrangler d1 execute DB --local --command="${sql.replace(/\n/g, ' ')}"`, {stdio: 'inherit'});
} catch (e) {
  console.log("Seed failed");
}
