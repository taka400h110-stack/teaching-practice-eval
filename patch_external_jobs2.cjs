const fs = require('fs');

let c = fs.readFileSync('/home/user/webapp/src/api/routes/externalJobs.ts', 'utf8');

c = c.replace(/body\.job_type,/, 'body.job_type || "UNKNOWN",');
c = c.replace(/user\.id,/, 'user.id || "unknown_user",');
c = c.replace(/user\.role,/, 'user.role || "unknown_role",');

fs.writeFileSync('/home/user/webapp/src/api/routes/externalJobs.ts', c);
console.log("Patched bind args");
