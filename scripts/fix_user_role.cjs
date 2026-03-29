const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, '../src/types/index.ts');
let content = fs.readFileSync(typesPath, 'utf-8');

if (!content.includes('"teacher"')) {
  content = content.replace('| "univ_teacher"', '| "teacher"\n  | "univ_teacher"');
  fs.writeFileSync(typesPath, content);
  console.log("Added 'teacher' to UserRole");
}

const dataPath = path.join(__dirname, '../src/api/routes/data.ts');
let dataContent = fs.readFileSync(dataPath, 'utf-8');

// Also fix `c.get("user")` -> `(c.get("user") as any)` to satisfy type checking for key
dataContent = dataContent.replace(/c\.get\(\"user\"\)/g, 'c.get("user" as any)');

// Fix `password` checking
dataContent = dataContent.replace(/bcrypt\.compare\(\(body as any\)\.password, user\.password_hash/g, 'bcrypt.compare(((body as any).password || "") as string, String((user as any).password_hash)');

// Fix `body[k]` checking 
dataContent = dataContent.replace(/\(body as any\)\[k\]/g, '(body as any)[k as keyof typeof body]');

fs.writeFileSync(dataPath, dataContent);

