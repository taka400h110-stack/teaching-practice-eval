const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/index.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('adminAnalyticsRouter')) {
  // Add import
  content = content.replace(
    'import adminAlertsRouter from "./api/routes/adminAlerts";',
    'import adminAlertsRouter from "./api/routes/adminAlerts";\nimport adminAnalyticsRouter from "./api/routes/adminAnalytics";'
  );
  
  // Add route mounting
  content = content.replace(
    'app.route("/api/admin/alerts", adminAlertsRouter);',
    'app.route("/api/admin/alerts", adminAlertsRouter);\napp.route("/api/admin/analytics", adminAnalyticsRouter);'
  );
  
  fs.writeFileSync(filePath, content);
  console.log('Updated index.tsx with adminAnalyticsRouter');
}
