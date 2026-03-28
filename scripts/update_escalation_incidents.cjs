const fs = require('fs');
const path = require('path');

const serviceFile = path.join(__dirname, '../src/api/services/cleanupAlertEscalationService.ts');
let content = fs.readFileSync(serviceFile, 'utf8');

if (!content.includes('triggerIncident')) {
  content = content.replace(
    "import { insertAuditLog } from './auditLogService';",
    "import { insertAuditLog } from './auditLogService';\nimport { triggerIncident, resolveIncident } from './cleanupIncidentService';"
  );
  
  // Trigger incident logic inside evaluateEscalations
  const incidentLogic = `
        // Trigger incident for L2 or L3
        if (newLevel === 'L2' || newLevel === 'L3') {
          await triggerIncident(env, {
            fingerprint: alert.fingerprint,
            severity: alert.severity,
            topReason: topReason,
            errorCount: alert.errorCount,
            lastErrorAt: alert.lastErrorAt || new Date().toISOString(),
            latestRunOutcome: alert.latestRunOutcome,
            dashboardUrl: alert.detailUrl,
            escalationLevel: newLevel
          });
        }
`;

  content = content.replace(
    '// Write to audit log (trigger)',
    incidentLogic + '\n        // Write to audit log (trigger)'
  );
  
  // Resolve incident logic
  const resolveIncidentLogic = `
        // Resolve incident
        await resolveIncident(env, {
          fingerprint: alert.fingerprint,
          reason: 'Alert resolved automatically'
        });
`;

  content = content.replace(
    "// Notify cancellation if needed",
    resolveIncidentLogic + '\n        // Notify cancellation if needed'
  );

  fs.writeFileSync(serviceFile, content);
  console.log('Updated cleanupAlertEscalationService.ts with incident triggering logic');
} else {
  console.log('Incident triggering logic already in cleanupAlertEscalationService.ts');
}
