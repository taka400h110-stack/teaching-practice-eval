const fs = require('fs');
const path = require('path');

const jobFile = path.join(__dirname, '../src/api/jobs/exportCleanup.ts');
let content = fs.readFileSync(jobFile, 'utf8');

if (!content.includes('upsertSlaEvent')) {
  content = content.replace(
    "import { SlackNotifier } from '../services/slackNotifier';",
    "import { SlackNotifier } from '../services/slackNotifier';\nimport { calculateSlaDeadline, upsertSlaEvent } from '../services/cleanupAlertSlaService';"
  );
  
  const slaLogic = `
      // Setup SLA
      const ackDeadline = await calculateSlaDeadline(env, alert.severity, 'ack', new Date().toISOString());
      if (ackDeadline) await upsertSlaEvent(env, alert.fingerprint, alert.severity, 'ack', ackDeadline);
      
      const resolveDeadline = await calculateSlaDeadline(env, alert.severity, 'resolve', new Date().toISOString());
      if (resolveDeadline) await upsertSlaEvent(env, alert.fingerprint, alert.severity, 'resolve', resolveDeadline);
      
      await notifiers.sendAll(alert, env);
`;

  content = content.replace(
    "await notifiers.sendAll(alert, env);",
    slaLogic
  );
  
  fs.writeFileSync(jobFile, content);
  console.log('Updated exportCleanup.ts with SLA setup logic');
} else {
  console.log('SLA setup logic already in exportCleanup.ts');
}
