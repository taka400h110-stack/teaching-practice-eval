const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/services/exportCleanupService.ts');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
  'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed insertCleanupAuditLog VALUES clause');
