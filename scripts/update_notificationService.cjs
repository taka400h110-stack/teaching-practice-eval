const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/services/notificationService.ts');
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('import { shouldSendCleanupAlertNotification')) {
  content = content.replace(
    'import { Env } from "../../types/env";',
    'import { Env } from "../../types/env";\nimport { shouldSendCleanupAlertNotification, recordCleanupAlertNotification } from "./alertNotificationPolicy";\nimport { insertCleanupAuditLog } from "./exportCleanupService";'
  );
  
  content = content.replace(
    'export interface CleanupAlertNotifier {',
    `export interface CleanupAlertNotifier {
  channel: string;`
  );
  
  content = content.replace(
    'async sendAll(alert: CleanupFailureAlertResponse, env: Env) {',
    `async sendAll(alert: CleanupFailureAlertResponse, env: Env) {
    if (!alert.hasAlert || !alert.fingerprint) return;
`
  );
  
  content = content.replace(
    '      try {',
    `      try {
        const decision = await shouldSendCleanupAlertNotification(
          env,
          'cleanup_failure',
          notifier.channel,
          alert.fingerprint,
          alert.severity
        );

        if (!decision.shouldSend) {
          if (decision.reason === 'cooldown' || decision.reason === 'duplicate_fingerprint') {
            await recordCleanupAlertNotification(
              env, 'cleanup_failure', notifier.channel, alert.fingerprint, alert.severity, 'suppressed', decision.reason
            );
            await insertCleanupAuditLog(env, {
              action: 'export_cleanup_alert_notify_suppressed',
              resourceType: 'cleanup_alert',
              resourceId: alert.fingerprint,
              outcome: 'success',
              changeSummary: { channel: notifier.channel, severity: alert.severity, reason: decision.reason, cooldownUntil: decision.cooldownUntil }
            });
          }
          continue;
        }
`
  );
  
  content = content.replace(
    'await notifier.send(alert, env);',
    `await notifier.send(alert, env);
        await recordCleanupAlertNotification(
          env, 'cleanup_failure', notifier.channel, alert.fingerprint, alert.severity, 'sent', 'ok'
        );
        await insertCleanupAuditLog(env, {
          action: 'export_cleanup_alert_notify',
          resourceType: 'cleanup_alert',
          resourceId: alert.fingerprint,
          outcome: 'success',
          changeSummary: { channel: notifier.channel, severity: alert.severity }
        });`
  );
  
  content = content.replace(
    '// Failures should not break the process. Audit logs can be recorded if needed.',
    `// Failures should not break the process. Audit logs can be recorded if needed.
        await recordCleanupAlertNotification(
          env, 'cleanup_failure', notifier.channel, alert.fingerprint, alert.severity, 'failed', String(error)
        );
        await insertCleanupAuditLog(env, {
          action: 'export_cleanup_alert_notify',
          resourceType: 'cleanup_alert',
          resourceId: alert.fingerprint,
          outcome: 'failed',
          changeSummary: { channel: notifier.channel, severity: alert.severity, error: String(error) }
        });`
  );
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Updated NotificationService');
}
