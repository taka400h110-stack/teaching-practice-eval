const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/services/exportCleanupService.ts');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
  'change_summary_json,',
  'change_summary_json,\n      http_method,\n      endpoint,'
);

content = content.replace(
  '?)',
  '?, ?, ?)'
);

content = content.replace(
  'data.changeSummary ? JSON.stringify(data.changeSummary) : null',
  `data.changeSummary ? JSON.stringify(data.changeSummary) : null,
    "CRON",
    "system-job"`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed insertCleanupAuditLog');
