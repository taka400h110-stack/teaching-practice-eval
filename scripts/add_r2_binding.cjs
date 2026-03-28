const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/wrangler.jsonc', 'utf-8');
const r2Config = `  "r2_buckets": [
    {
      "binding": "EXPORTS_BUCKET",
      "bucket_name": "teaching-practice-exports",
      "preview_bucket_name": "teaching-practice-exports-preview"
    }
  ],
`;

if (!content.includes('r2_buckets')) {
  content = content.replace('"d1_databases": [', r2Config + '  "d1_databases": [');
  fs.writeFileSync('/home/user/webapp/wrangler.jsonc', content);
}
