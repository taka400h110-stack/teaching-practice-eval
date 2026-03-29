const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/exports.ts');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace('import { D1Database } from "@cloudflare/workers-types";', 'import { D1Database, R2Bucket } from "@cloudflare/workers-types";');
content = content.replace('type Env = { Bindings: { DB: D1Database }, Variables: { user: any } };', 'type Env = { Bindings: { DB: D1Database, EXPORTS_BUCKET: R2Bucket }, Variables: { user: any } };');

fs.writeFileSync(filePath, content);
