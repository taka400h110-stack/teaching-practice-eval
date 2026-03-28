const fs = require('fs');
const files = [
  '/home/user/webapp/src/api/services/cleanupIncidentService.ts',
  '/home/user/webapp/src/api/services/cleanupAlertSlaService.ts'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import { insertAuditLog } from './auditLogService';", "import { insertCleanupAuditLog as insertAuditLog } from './exportCleanupService';");
  fs.writeFileSync(file, content);
});
console.log('Fixed imports');
