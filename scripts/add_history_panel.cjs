const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/AdminDashboardPage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('AlertHistoryPanel')) {
  content = content.replace(
    'import { CleanupFailureAlertBanner } from "../components/admin/CleanupFailureAlertBanner";',
    'import { CleanupFailureAlertBanner } from "../components/admin/CleanupFailureAlertBanner";\nimport { AlertHistoryPanel } from "../components/admin/AlertHistoryPanel";'
  );

  content = content.replace(
    '<CleanupMetricsPanel />',
    '<CleanupMetricsPanel />\n      <AlertHistoryPanel />'
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Added AlertHistoryPanel to Dashboard');
}
