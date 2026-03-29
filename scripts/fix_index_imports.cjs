const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '../src/index.tsx');
let content = fs.readFileSync(indexFile, 'utf8');

if (!content.includes("import adminAnalyticsRouter")) {
  content = content.replace(
    "import adminAlertsRouter from './api/routes/adminAlerts';",
    "import adminAlertsRouter from './api/routes/adminAlerts';\nimport adminAnalyticsRouter from './api/routes/adminAnalytics';\nimport adminIncidentsRouter from './api/routes/adminIncidents';\nimport adminOperationalReadinessRouter from './api/routes/adminOperationalReadiness';"
  );
  
  if (!content.includes("app.route('/api/admin/incidents'")) {
    content = content.replace(
      'app.route("/api/admin/analytics", adminAnalyticsRouter);',
      'app.route("/api/admin/analytics", adminAnalyticsRouter);\napp.route("/api/admin/incidents", adminIncidentsRouter);\napp.route("/api/admin/operational-readiness", adminOperationalReadinessRouter);'
    );
  }

  fs.writeFileSync(indexFile, content);
  console.log('Fixed imports in index.tsx');
} else {
  console.log('Imports already fixed');
}
