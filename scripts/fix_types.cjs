const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, '../src/types/index.ts');
if (fs.existsSync(typesPath)) {
  let typesContent = fs.readFileSync(typesPath, 'utf-8');
  if (!typesContent.includes('"teacher"')) {
    typesContent = typesContent.replace(
      'export type UserRole = "student" | "univ_teacher" | "school_mentor" | "researcher" | "admin" | "collaborator" | "board_observer" | "evaluator";',
      'export type UserRole = "student" | "teacher" | "univ_teacher" | "school_mentor" | "researcher" | "admin" | "collaborator" | "board_observer" | "evaluator";'
    );
    fs.writeFileSync(typesPath, typesContent);
    console.log("Added 'teacher' to UserRole");
  }
}

const dataPath = path.join(__dirname, '../src/api/routes/data.ts');
let dataContent = fs.readFileSync(dataPath, 'utf-8');

dataContent = dataContent.replace(/const user = c\.get\("user"\);/g, 'const user = c.get("user") as any;');
dataContent = dataContent.replace(/c\.get\("user"\)\?/g, '(c.get("user") as any)?');
dataContent = dataContent.replace(/c\.get\("user"\)\./g, '(c.get("user") as any).');
dataContent = dataContent.replace(/const studentId = user\.id;/g, 'const studentId = (user as any).id;');
dataContent = dataContent.replace(/const role = user\.role/g, 'const role = (user as any).role');
dataContent = dataContent.replace(/requireRoles\(\[/g, 'requireRoles(([');
dataContent = dataContent.replace(/\]\)/g, '] as unknown as UserRole[]))');
dataContent = dataContent.replace(/requireRoles\(\(\(\[/g, 'requireRoles(([');
dataContent = dataContent.replace(/\] as unknown as UserRole\[\]\)\) as unknown as UserRole\[\]\)\)/g, '] as unknown as UserRole[]))');

// Fix ts errors for variables being passed as wrong type
dataContent = dataContent.replace(/user\.id/g, '(user as any).id');
dataContent = dataContent.replace(/const studentId = c\.get\("user"\)\.id;/g, 'const studentId = (c.get("user") as any).id;');
dataContent = dataContent.replace(/body\.password/g, '(body as any).password');

fs.writeFileSync(dataPath, dataContent);
console.log("Fixed data.ts types");

