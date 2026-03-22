const fs = require('fs');

let dataTs = fs.readFileSync('/home/user/webapp/src/api/routes/data.ts', 'utf8');

dataTs = dataTs.replace(
  'const { email, password } = body;',
  'await ensureSchema(db);\n  const { email, password } = body;'
);

fs.writeFileSync('/home/user/webapp/src/api/routes/data.ts', dataTs);
console.log('Added ensureSchema to /auth/login');
