import { Env } from '../../types/env';
import { checkAndBreachSla } from '../services/cleanupAlertSlaService';
import { NotificationService } from '../services/notificationService';
import { SlackNotifier } from '../services/slackNotifier';
import { EmailNotifier } from '../services/emailNotifier';

export async function runCleanupAlertSlaJob(env: Env) {
  if (env.CLEANUP_ALERT_SLA_ENABLED !== 'true') {
    return;
  }

  console.log('Running SLA evaluation job...');
  
  // 1. Mark newly breached SLAs
  await checkAndBreachSla(env);

  // 2. Fetch breached SLAs that need notification
  // Wait interval logic (default 30 mins)
  const renotifyIntervalMinutes = parseInt(env.CLEANUP_ALERT_SLA_RENOTIFY_INTERVAL_MINUTES || '30', 10);
  const maxNotifCount = parseInt(env.CLEANUP_ALERT_SLA_MAX_RENOTIFY_COUNT || '3', 10);

  const slasToNotify = await env.DB.prepare(`
    SELECT * FROM cleanup_alert_sla_events
    WHERE status = 'breached' 
      AND notification_count < ?
      AND (last_notified_at IS NULL OR datetime(last_notified_at) <= datetime('now', '-' || ? || ' minutes'))
  `).bind(maxNotifCount, renotifyIntervalMinutes).all();

  const notificationService = new NotificationService();
  if (env.CLEANUP_ALERT_SLA_CHANNELS?.includes('slack')) notificationService.register(new SlackNotifier());
  if (env.CLEANUP_ALERT_SLA_CHANNELS?.includes('email')) notificationService.register(new EmailNotifier());

  for (const sla of slasToNotify.results) {
    // Send Notification
    await notificationService.sendAll({
      hasAlert: true,
      severity: sla.severity as 'critical'|'warning',
      rangeHours: 24,
      errorCount: 1,
      lastErrorAt: new Date().toISOString(),
      latestRunOutcome: 'failed',
      topReasons: [{reason: `SLA Breached (${sla.sla_type})`, count: 1}],
      recentErrors: [],
      fingerprint: sla.fingerprint as string,
      dismissed: false,
      detailUrl: `https://example.com/admin/alerts/${sla.fingerprint}`
    }, env);

    // Update count
    await env.DB.prepare(`
      UPDATE cleanup_alert_sla_events 
      SET notification_count = notification_count + 1,
          last_notified_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(sla.id).run();
  }

  console.log('SLA evaluation job completed.');
}
