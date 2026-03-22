const fs = require('fs');

let index = fs.readFileSync('/home/user/webapp/src/index.tsx', 'utf8');

// Insert import
if (!index.includes('externalJobsRouter')) {
  index = index.replace(/import dataRouter from ".\/api\/routes\/data";/, 'import dataRouter from "./api/routes/data";\nimport externalJobsRouter from "./api/routes/externalJobs";');
}

// Insert route
if (!index.includes('/api/external-jobs')) {
  index = index.replace(/app\.route\("\/api\/data", dataRouter\);/, 'app.route("/api/data", dataRouter);\napp.route("/api/external-jobs", externalJobsRouter);');
}

fs.writeFileSync('/home/user/webapp/src/index.tsx', index);
console.log("Updated index.tsx with externalJobsRouter");
