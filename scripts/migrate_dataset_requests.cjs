const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../init_schema.sql');
let schemaContent = fs.readFileSync(schemaPath, 'utf-8');

const newColumns = `
  export_object_key TEXT,
  export_content_type TEXT,
  export_file_size_bytes INTEGER,
  export_sha256 TEXT,
  export_generated_at TEXT,
  export_storage_backend TEXT,
  signed_url_expires_at TEXT,
  last_downloaded_at TEXT,
`;

if (!schemaContent.includes('export_object_key')) {
  schemaContent = schemaContent.replace(
    'export_file_hash TEXT,',
    'export_file_hash TEXT,\n' + newColumns
  );
  fs.writeFileSync(schemaPath, schemaContent);
  console.log("Added columns to dataset_export_requests");
}

