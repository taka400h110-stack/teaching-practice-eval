const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '../src/index.tsx');
let content = fs.readFileSync(indexFile, 'utf8');

if (!content.includes('adminOperationalReadinessRouter')) {
  content = content.replace(
    "import adminIncidentsRouter from './api/routes/adminIncidents';",
    "import adminIncidentsRouter from './api/routes/adminIncidents';\nimport adminOperationalReadinessRouter from './api/routes/adminOperationalReadiness';"
  );
  
  content = content.replace(
    "app.route('/api/admin/incidents', adminIncidentsRouter);",
    "app.route('/api/admin/incidents', adminIncidentsRouter);\napp.route('/api/admin/operational-readiness', adminOperationalReadinessRouter);"
  );
  
  fs.writeFileSync(indexFile, content);
  console.log('Added adminOperationalReadinessRouter to index.tsx');
} else {
  console.log('adminOperationalReadinessRouter already in index.tsx');
}
