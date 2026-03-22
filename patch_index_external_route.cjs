const fs = require('fs');

let index = fs.readFileSync('/home/user/webapp/src/index.tsx', 'utf8');

if (!index.includes('/api/external-jobs')) {
  index = index.replace(/app\.route\("\/api\/data",\s*dataRouter\);/, 'app.route("/api/data",   dataRouter);\napp.route("/api/external-jobs", externalJobsRouter);');
  fs.writeFileSync('/home/user/webapp/src/index.tsx', index);
  console.log("Updated index.tsx with route!");
} else {
  console.log("Already included?");
}
