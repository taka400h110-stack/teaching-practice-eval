import { D1Database } from "@cloudflare/workers-types";
import { Env } from "../../types/env";

export type NotificationDecision = {
  shouldSend: boolean;
  reason:
    | "ok"
    | "duplicate_fingerprint"
    | "cooldown"
    | "channel_disabled"
    | "no_alert";
  cooldownUntil?: string | null;
};

export async function shouldSendCleanupAlertNotification(
  env: Env,
  alertType: string,
  channel: string,
  fingerprint: string,
  severity: "warning" | "critical" | "none"
): Promise<NotificationDecision> {
  if (severity === "none") {
    return { shouldSend: false, reason: "no_alert" };
  }

  // Check channel enabled
  if (channel === 'slack' && env.SLACK_CLEANUP_ALERT_ENABLED !== 'true') {
    return { shouldSend: false, reason: "channel_disabled" };
  }
  if (channel === 'email' && env.EMAIL_CLEANUP_ALERT_ENABLED !== 'true') {
    return { shouldSend: false, reason: "channel_disabled" };
  }

  // Check duplicate fingerprint
  const duplicate = await env.DB.prepare(`
    SELECT id FROM cleanup_alert_notifications 
    WHERE alert_type = ? AND channel = ? AND fingerprint = ? AND status = 'sent'
    LIMIT 1
  `).bind(alertType, channel, fingerprint).first();

  if (duplicate) {
    return { shouldSend: false, reason: "duplicate_fingerprint" };
  }

  // Check cooldown
  const lastSent = await env.DB.prepare(`
    SELECT sent_at FROM cleanup_alert_notifications 
    WHERE alert_type = ? AND channel = ? AND status = 'sent'
    ORDER BY sent_at DESC LIMIT 1
  `).bind(alertType, channel).first<{ sent_at: string }>();

  if (lastSent) {
    const lastSentDate = new Date(lastSent.sent_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSentDate.getTime()) / 60000;
    
    let cooldownMinutes = 60; // default 60 min
    if (severity === "critical") {
      cooldownMinutes = parseInt(env.CLEANUP_ALERT_CRITICAL_COOLDOWN_MINUTES || "15", 10);
    } else {
      cooldownMinutes = parseInt(env.CLEANUP_ALERT_COOLDOWN_MINUTES || "60", 10);
    }

    if (diffMinutes < cooldownMinutes) {
      const cooldownUntil = new Date(lastSentDate.getTime() + cooldownMinutes * 60000).toISOString();
      return { shouldSend: false, reason: "cooldown", cooldownUntil };
    }
  }

  return { shouldSend: true, reason: "ok" };
}

export async function recordCleanupAlertNotification(
  env: Env,
  alertType: string,
  channel: string,
  fingerprint: string,
  severity: string,
  status: "sent" | "suppressed" | "failed",
  reason: string | null = null
) {
  const id = globalThis.crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO cleanup_alert_notifications (id, alert_type, fingerprint, severity, channel, status, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, alertType, fingerprint, severity, channel, status, reason).run();
}
