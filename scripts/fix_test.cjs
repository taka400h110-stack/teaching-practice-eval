const fs = require('fs');
let path = '/home/user/webapp/tests/exports-ui.spec.ts';
let content = fs.readFileSync(path, 'utf8');

const researcherUser = JSON.stringify({ id: 'researcher-1', role: 'researcher', email: 'researcher@test.com' });
const adminUser = JSON.stringify({ id: 'admin-1', role: 'admin', email: 'admin@test.com' });

content = content.replace(
  "window.localStorage.setItem('auth_token', token);",
  "window.localStorage.setItem('auth_token', token);\n      window.localStorage.setItem('token', token);\n      window.localStorage.setItem('user', `" + researcherUser + "`);"
).replace(
  "window.localStorage.setItem('auth_token', token);",
  "window.localStorage.setItem('auth_token', token);\n      window.localStorage.setItem('token', token);\n      window.localStorage.setItem('user', `" + adminUser + "`);"
);

fs.writeFileSync(path, content);
