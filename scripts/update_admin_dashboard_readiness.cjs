const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, '../src/pages/AdminDashboardPage.tsx');
let content = fs.readFileSync(pageFile, 'utf8');

if (!content.includes('ProviderHealthPanel')) {
  content = content.replace(
    "import { DeliveryAnalyticsPanel } from '../components/admin/DeliveryAnalyticsPanel';",
    "import { DeliveryAnalyticsPanel } from '../components/admin/DeliveryAnalyticsPanel';\nimport { ProviderHealthPanel } from '../components/admin/ProviderHealthPanel';"
  );
  
  content = content.replace(
    "<DeliveryAnalyticsPanel />",
    "<ProviderHealthPanel />\n        <DeliveryAnalyticsPanel />"
  );
  
  fs.writeFileSync(pageFile, content);
  console.log('Added ProviderHealthPanel to AdminDashboardPage.tsx');
} else {
  console.log('ProviderHealthPanel already in AdminDashboardPage.tsx');
}
