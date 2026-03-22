const fs = require('fs');
let c = fs.readFileSync('/home/user/webapp/src/api/routes/externalJobs.ts', 'utf8');

c = c.replace(/const id = crypto\.randomUUID\(\);/, `const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'job-' + Date.now() + '-' + Math.floor(Math.random()*1000);`);

fs.writeFileSync('/home/user/webapp/src/api/routes/externalJobs.ts', c);
console.log("Patched UUID");
