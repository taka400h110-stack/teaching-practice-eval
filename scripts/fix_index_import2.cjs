const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '../src/index.tsx');
let content = fs.readFileSync(indexFile, 'utf8');

if (!content.includes("import adminAnalyticsRouter")) {
  content = content.replace(
    "import adminAlertsRouter from './api/routes/adminAlerts';",
    "import adminAlertsRouter from './api/routes/adminAlerts';\nimport adminAnalyticsRouter from './api/routes/adminAnalytics';"
  );
  fs.writeFileSync(indexFile, content);
  console.log('Fixed imports in index.tsx');
}
