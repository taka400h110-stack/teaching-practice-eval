const fs = require('fs');
const path = require('path');

const serviceFile = path.join(__dirname, '../src/api/services/cleanupAlertService.ts');
let content = fs.readFileSync(serviceFile, 'utf8');

if (!content.includes('import { resolveSla }')) {
  content = content.replace(
    "import { insertAuditLog } from './auditLogService';",
    "import { insertAuditLog } from './auditLogService';\nimport { resolveSla } from './cleanupAlertSlaService';"
  );
  
  // Before returning in upsertCleanupAlertAcknowledgment, resolve SLAs
  const resolveSlaLogic = `
  // Resolve SLA events based on status
  if (status === 'acknowledged' || status === 'investigating' || status === 'resolved') {
    await resolveSla(env, fingerprint, 'ack');
  }
  if (status === 'resolved') {
    await resolveSla(env, fingerprint, 'resolve');
  }
`;

  content = content.replace(
    'return {',
    resolveSlaLogic + '\n  return {'
  );

  fs.writeFileSync(serviceFile, content);
  console.log('Updated upsertCleanupAlertAcknowledgment with SLA resolution logic');
} else {
  console.log('SLA resolution logic already in cleanupAlertService.ts');
}
