const fs = require('fs');

let c = fs.readFileSync('/home/user/webapp/src/api/client.ts', 'utf8');
c = c.replace(/overall_score: "pending",/g, '');
c = c.replace(/weekly_scores: \[\]/g, 'weekly_scores: [] as any[]');
fs.writeFileSync('/home/user/webapp/src/api/client.ts', c);

let td = fs.readFileSync('/home/user/webapp/src/pages/TeacherDashboardPage.tsx', 'utf8');
td = td.replace(/const typeMap = \{/, 'const typeMap: Record<string, string> = {');
td = td.replace(/const label = \(typeMap as any\)\[t\.school_type\] \|\| t\.school_type;/, 'const label = typeMap[t.school_type] || t.school_type;');
fs.writeFileSync('/home/user/webapp/src/pages/TeacherDashboardPage.tsx', td);

console.log("Patched TS errors 2");
