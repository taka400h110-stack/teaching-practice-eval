const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/jobs/exportCleanup.ts');
let content = fs.readFileSync(filePath, 'utf-8');

content = content.replace(
  `      // Check if we already notified for this fingerprint recently
      const alreadyNotified = await env.DB.prepare(\`
        SELECT id FROM audit_logs 
        WHERE action = 'export_cleanup_alert_notify' 
        AND resource_id = ?
        LIMIT 1
      \`).bind(alert.fingerprint).first();

      if (!alreadyNotified) {
        const notifiers = new NotificationService();
        notifiers.register(new SlackNotifier());
        notifiers.register(new EmailNotifier());

        await notifiers.sendAll(alert, env);

        await insertCleanupAuditLog(env, {
          action: "export_cleanup_alert_notify",
          resourceType: "cleanup_alert",
          resourceId: alert.fingerprint,
          outcome: "success",
          changeSummary: {
            errorCount: alert.errorCount,
            lastErrorAt: alert.lastErrorAt,
            severity: alert.severity
          }
        });
      }`,
  `      const notifiers = new NotificationService();
      notifiers.register(new SlackNotifier());
      notifiers.register(new EmailNotifier());

      await notifiers.sendAll(alert, env);`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed exportCleanup.ts notify duplicate logic');
