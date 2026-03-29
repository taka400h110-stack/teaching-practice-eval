const { execSync } = require('child_process');

const queries = [
  "CREATE INDEX IF NOT EXISTS idx_export_requests_status_generated_at ON dataset_export_requests(status, export_generated_at);"
];

for (const q of queries) {
  try {
    console.log('Running:', q);
    execSync(`npx wrangler d1 execute DB --local --command="${q}"`, { stdio: 'inherit', cwd: '/home/user/webapp' });
  } catch (e) {
    console.log('Failed');
  }
}
