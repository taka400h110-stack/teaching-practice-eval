const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('import { UserRole }')) {
  content = content.replace('import { applyAnonymization }', 'import { UserRole } from "../../types";\nimport { applyAnonymization }');
}

// c.get("user") -> (c.get("user") as any)
content = content.replace(/c\.get\("user"\)/g, '(c.get("user") as any)');

// requireRoles(["student"]) -> requireRoles(["student"] as UserRole[])
content = content.replace(/requireRoles\(\[\"([^\"]+)\"\]\)/g, 'requireRoles(["$1"] as UserRole[])');
content = content.replace(/requireRoles\(\[\"([^\"]+)\",\s*\"([^\"]+)\"\]\)/g, 'requireRoles(["$1", "$2"] as UserRole[])');

// `student_id: user.id` => `student_id: (user as any).id`
content = content.replace(/student_id:\s+user\.id/g, 'student_id: (user as any).id');
content = content.replace(/user_id:\s+user\.id/g, 'user_id: (user as any).id');

// `await bcrypt.compare(body.password,` => `await bcrypt.compare((body as any).password,`
content = content.replace(/await bcrypt\.compare\(body\.password,/g, 'await bcrypt.compare((body as any).password,');

// `Number(body[k])` -> `Number((body as any)[k])`
content = content.replace(/body\[k\]/g, '(body as any)[k]');

fs.writeFileSync(filePath, content);
console.log("Fixed more types");
