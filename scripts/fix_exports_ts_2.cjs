const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf8');

// Cast results
content = content.replace(
  'const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first();',
  'const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first() as any;'
);

content = content.replace(
  'const tokenRes = await db.prepare(\`\n    SELECT * FROM dataset_download_tokens WHERE token_hash = ? AND is_revoked = 0 AND expires_at > CURRENT_TIMESTAMP\n  \`).bind(token).first();',
  'const tokenRes = await db.prepare(\`\n    SELECT * FROM dataset_download_tokens WHERE token_hash = ? AND is_revoked = 0 AND expires_at > CURRENT_TIMESTAMP\n  \`).bind(token).first() as any;'
);

content = content.replace(
  'const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(tokenRes.export_request_id).first();',
  'const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(tokenRes.export_request_id).first() as any;'
);

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
