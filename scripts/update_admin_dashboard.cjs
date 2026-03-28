const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/AdminDashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('DeliveryAnalyticsPanel')) {
  content = content.replace(
    "import { AlertHistoryPanel } from '../components/admin/AlertHistoryPanel';",
    "import { AlertHistoryPanel } from '../components/admin/AlertHistoryPanel';\nimport { DeliveryAnalyticsPanel } from '../components/admin/DeliveryAnalyticsPanel';"
  );
  
  content = content.replace(
    '<AlertHistoryPanel />',
    '<DeliveryAnalyticsPanel />\n        <AlertHistoryPanel />'
  );

  fs.writeFileSync(filePath, content);
  console.log('Updated AdminDashboardPage.tsx with DeliveryAnalyticsPanel');
}
