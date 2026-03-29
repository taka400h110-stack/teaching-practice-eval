const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/services/cleanupAlertEscalationService.ts');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  'import { sendNotification } from "./notificationService";',
  'import { NotificationService } from "./notificationService";\nimport { SlackNotifier } from "./slackNotifier";\nimport { EmailNotifier } from "./emailNotifier";'
);

const notifyBlock = `
  // Notify
  const notifiers = new NotificationService();
  notifiers.register(new SlackNotifier());
  notifiers.register(new EmailNotifier());
  await notifiers.sendAll({
    hasAlert: true,
    severity: level === 3 ? 'critical' : 'warning',
    rangeHours: 24,
    errorCount: 1,
    lastErrorAt: now,
    latestRunOutcome: 'failed',
    topReasons: [{ reason, count: 1 }],
    recentErrors: [],
    fingerprint,
    dismissed: false,
    detailUrl: '/admin/system?tab=cleanup'
  }, env);
`;

content = content.replace(
  /\/\/ Notify[\s\S]*?lastErrorAt: now\n  \}\);/m,
  notifyBlock
);

fs.writeFileSync(filePath, content);
console.log('Updated escalation notify');
