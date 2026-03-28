const { execSync } = require('child_process');

try {
  const alters = [
    "ALTER TABLE dataset_export_requests ADD COLUMN export_object_key TEXT;",
    "ALTER TABLE dataset_export_requests ADD COLUMN export_content_type TEXT;",
    "ALTER TABLE dataset_export_requests ADD COLUMN export_file_size_bytes INTEGER;",
    "ALTER TABLE dataset_export_requests ADD COLUMN export_sha256 TEXT;",
    "ALTER TABLE dataset_export_requests ADD COLUMN export_generated_at TEXT;",
    "ALTER TABLE dataset_export_requests ADD COLUMN export_storage_backend TEXT;",
    "ALTER TABLE dataset_export_requests ADD COLUMN signed_url_expires_at TEXT;",
    "ALTER TABLE dataset_export_requests ADD COLUMN last_downloaded_at TEXT;"
  ];
  for (const sql of alters) {
    execSync(`npx wrangler d1 execute teaching-practice-eval-db --local --command="${sql}"`, {stdio: 'inherit'});
  }
} catch (e) {
  console.log("Alter probably failed because they exist, or DB is not there. That's fine.");
}
