const fs = require('fs');
const file = '/home/user/webapp/src/components/AppLayout.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/!user\.roles/g, '!(user as any).roles');
fs.writeFileSync(file, content);
console.log("Fixed AppLayout.tsx");
