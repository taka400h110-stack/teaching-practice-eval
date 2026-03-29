const fs = require('fs');
let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf-8');

content = content.replace(
  'const user = c.get("user");\n  \n  const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first() as any;',
  'const user = c.get("user");\n  const body = await c.req.json().catch(() => ({}));\n  \n  const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first() as any;'
);

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
