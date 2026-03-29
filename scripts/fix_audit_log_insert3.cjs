const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/services/exportCleanupService.ts');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
  'endpoint,',
  'endpoint,\n      status_code,'
);

content = content.replace(
  '?, ?, ?)',
  '?, ?, ?, ?)'
);

content = content.replace(
  '"system-job"',
  '"system-job",\n    200'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed insertCleanupAuditLog status_code');
