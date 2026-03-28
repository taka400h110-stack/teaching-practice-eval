const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Undo the regex mess
content = content.replace(/const avg = \(arr: number\[\] as unknown as UserRole\[\]\)\)/g, 'const avg = (arr: number[])');
content = content.replace(/requireRoles\(\(\(\[/g, 'requireRoles([');
content = content.replace(/\] as unknown as UserRole\[\]\)\)/g, '] as UserRole[])');

// I also probably messed up `.push(item.score as unknown as UserRole[]))` ? No, `])` only matches array end and parenthesis.
// Where else was `])` used?
// Let's check the compiler errors: 
// src/api/routes/data.ts(1500,69): error TS1005: ',' expected.
// src/api/routes/data.ts(1731,69): error TS1005: ',' expected.
// src/api/routes/data.ts(1864,69): error TS1005: ',' expected.

// Just write a generic undo for ` as unknown as UserRole[]))` to `)` if it's not preceded by a string like `"admin"`
