const fs = require('fs');
let code = fs.readFileSync('src/pages/AdvancedAnalyticsPage.tsx', 'utf8');

if (!code.endsWith("}")) {
  code = code + "}\n";
  fs.writeFileSync('src/pages/AdvancedAnalyticsPage.tsx', code);
}
