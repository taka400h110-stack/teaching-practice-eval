const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf8');

// Fix Hono generic
content = content.replace(
  'const exportsRouter = new Hono();',
  'import { D1Database } from "@cloudflare/workers-types";\nimport { UserRole } from "../../types";\n\ntype Env = { Bindings: { DB: D1Database }, Variables: { user: any } };\nconst exportsRouter = new Hono<Env>();'
);

// Fix RESEARCH_ROLES type
content = content.replace(
  'const RESEARCH_ROLES = ["researcher", "collaborator", "board_observer", "admin"];',
  'const RESEARCH_ROLES: UserRole[] = ["researcher", "collaborator", "board_observer", "admin"];'
);

// Fix requireRoles(["admin"])
content = content.replace(
  /requireRoles\(\["admin"\]\)/g,
  'requireRoles(["admin"] as UserRole[])'
);

// Fix requireRoles(["admin", "researcher", "collaborator"])
content = content.replace(
  /requireRoles\(\["admin", "researcher", "collaborator"\]\)/g,
  'requireRoles(["admin", "researcher", "collaborator"] as UserRole[])'
);

// Fix setAuditReadContext outcome
content = content.replace(
  'setAuditReadContext(c, { resourceType: "dataset_download", outcome: "forbidden", reason: "Invalid or expired token" });',
  'setAuditReadContext(c, { resourceType: "dataset_download", reason: "Invalid or expired token" });'
);

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
console.log('Fixed exports.ts');
