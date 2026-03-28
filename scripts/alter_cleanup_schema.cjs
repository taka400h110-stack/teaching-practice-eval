const { execSync } = require('child_process');

const queries = [
  "ALTER TABLE dataset_download_tokens ADD COLUMN cleanup_completed_at TEXT;",
  "ALTER TABLE dataset_download_tokens ADD COLUMN cleanup_reason TEXT;",
  "ALTER TABLE dataset_export_requests ADD COLUMN deleted_at TEXT;",
  "ALTER TABLE dataset_export_requests ADD COLUMN cleanup_reason TEXT;",
  "ALTER TABLE dataset_export_requests ADD COLUMN last_cleanup_at TEXT;",
  "ALTER TABLE dataset_export_requests ADD COLUMN storage_deleted_at TEXT;",
  "CREATE INDEX IF NOT EXISTS idx_download_tokens_expiry ON dataset_download_tokens(expires_at);",
  "CREATE INDEX IF NOT EXISTS idx_download_tokens_used_at ON dataset_download_tokens(used_at);",
  "CREATE INDEX IF NOT EXISTS idx_export_requests_expires_at ON dataset_export_requests(expires_at);",
  "CREATE INDEX IF NOT EXISTS idx_export_requests_status_generated_at ON dataset_export_requests(status, generated_at);",
  "CREATE INDEX IF NOT EXISTS idx_export_requests_object_key ON dataset_export_requests(export_object_key);" // It's named export_object_key in this schema
];

for (const q of queries) {
  try {
    console.log('Running:', q);
    execSync(`npx wrangler d1 execute DB --local --command="${q}"`, { stdio: 'inherit', cwd: '/home/user/webapp' });
  } catch (e) {
    console.log('Failed (maybe already exists)');
  }
}
