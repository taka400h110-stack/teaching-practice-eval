import { CleanupFailureAlertResponse } from "../../types/adminAlerts";
import { Env } from "../../types/env";
import { shouldSendCleanupAlertNotification, recordCleanupAlertNotification } from "./alertNotificationPolicy";
import { insertCleanupAuditLog } from "./exportCleanupService";

export interface CleanupAlertNotifier {
  channel: string;
  send(alert: CleanupFailureAlertResponse, env: Env): Promise<void>;
}

export class NotificationService {
  private notifiers: CleanupAlertNotifier[] = [];

  register(notifier: CleanupAlertNotifier) {
    this.notifiers.push(notifier);
  }

  async sendAll(alert: CleanupFailureAlertResponse, env: Env) {
    if (!alert.hasAlert || !alert.fingerprint) return;

    for (const notifier of this.notifiers) {
      try {
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

        await notifier.send(alert, env);
        await recordCleanupAlertNotification(
          env, 'cleanup_failure', notifier.channel, alert.fingerprint, alert.severity, 'sent', 'ok'
        );
        await insertCleanupAuditLog(env, {
          action: 'export_cleanup_alert_notify',
          resourceType: 'cleanup_alert',
          resourceId: alert.fingerprint,
          outcome: 'success',
          changeSummary: { channel: notifier.channel, severity: alert.severity }
        });
      } catch (error) {
        console.error("Failed to send notification via notifier:", error);
        // Failures should not break the process. Audit logs can be recorded if needed.
        await recordCleanupAlertNotification(
          env, 'cleanup_failure', notifier.channel, alert.fingerprint, alert.severity, 'failed', String(error)
        );
        await insertCleanupAuditLog(env, {
          action: 'export_cleanup_alert_notify',
          resourceType: 'cleanup_alert',
          resourceId: alert.fingerprint,
          outcome: 'failed',
          changeSummary: { channel: notifier.channel, severity: alert.severity, error: String(error) }
        });
      }
    }
  }
}
