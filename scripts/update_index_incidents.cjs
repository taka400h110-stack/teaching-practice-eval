const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '../src/index.tsx');
let content = fs.readFileSync(indexFile, 'utf8');

if (!content.includes('adminIncidentsRouter')) {
  content = content.replace(
    "import adminAnalyticsRouter from './api/routes/adminAnalytics';",
    "import adminAnalyticsRouter from './api/routes/adminAnalytics';\nimport adminIncidentsRouter from './api/routes/adminIncidents';"
  );
  
  content = content.replace(
    "app.route('/api/admin/analytics', adminAnalyticsRouter);",
    "app.route('/api/admin/analytics', adminAnalyticsRouter);\napp.route('/api/admin/incidents', adminIncidentsRouter);"
  );
  
  fs.writeFileSync(indexFile, content);
  console.log('Added adminIncidentsRouter to index.tsx');
} else {
  console.log('adminIncidentsRouter already in index.tsx');
}
