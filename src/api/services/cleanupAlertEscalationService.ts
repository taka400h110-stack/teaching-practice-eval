import { Env } from "../../types/env";
import { insertCleanupAuditLog as insertAuditLog } from "./exportCleanupService";
import { NotificationService } from "./notificationService";
import { SlackNotifier } from "./slackNotifier";
import { EmailNotifier } from "./emailNotifier";

export interface EscalationRow {
  id: string;
  fingerprint: string;
  level: number;
  status: string;
  triggered_at: string;
  resolved_at: string | null;
  note: string | null;
}

export async function evaluateEscalations(env: Env) {
  if (env.CLEANUP_ALERT_ESCALATION_ENABLED === 'false') return;

  const db = env.DB;
  const now = new Date();
  
  // Get active alerts (recent errors in last 24h, we'd normally query from audit logs or a summary view)
  // For simplicity, we assume we have an active failures list from audit_logs
  const recentFailures = await db.prepare(`
    SELECT json_extract(change_summary_json, '$.fingerprint') as fingerprint,
           MAX(occurred_at) as last_error_at,
           COUNT(*) as error_count
    FROM audit_logs
    WHERE action IN ('export_cleanup_token', 'export_cleanup_object', 'export_cleanup_reconcile')
      AND outcome != 'success'
      AND occurred_at > datetime('now', '-24 hours')
    GROUP BY fingerprint
    HAVING fingerprint IS NOT NULL
  `).all<{ fingerprint: string, last_error_at: string, error_count: number }>();

  if (!recentFailures.results || recentFailures.results.length === 0) return;

  const l1Minutes = parseInt(env.CLEANUP_ALERT_ESCALATION_L1_MINUTES || '30', 10);
  const l2Minutes = parseInt(env.CLEANUP_ALERT_ESCALATION_L2_MINUTES || '120', 10);
  const l3Minutes = parseInt(env.CLEANUP_ALERT_ESCALATION_L3_MINUTES || '360', 10);

  for (const failure of recentFailures.results) {
    // Check acknowledgment status
    const ack = await db.prepare(
      `SELECT status, created_at, resolved_at FROM cleanup_alert_acknowledgments WHERE fingerprint = ?`
    ).bind(failure.fingerprint).first<{ status: string, created_at: string, resolved_at: string | null }>();

    if (ack && ack.status === 'resolved') {
      // Resolve any open escalations
      await resolveEscalation(env, failure.fingerprint);
      continue;
    }

    if (env.CLEANUP_ALERT_ESCALATION_REQUIRE_UNACKED !== 'false') {
      if (ack && (ack.status === 'acknowledged' || ack.status === 'investigating')) {
        // Suppress escalations if acked
        continue;
      }
    }

    // Determine age (from first error or just last error? standard says "unacked for X time")
    // Let's use the time since the first error in the current 24h window for this fingerprint
    const firstError = await db.prepare(`
      SELECT MIN(occurred_at) as first_error_at
      FROM audit_logs
      WHERE json_extract(change_summary_json, '$.fingerprint') = ?
        AND action IN ('export_cleanup_token', 'export_cleanup_object', 'export_cleanup_reconcile')
        AND outcome != 'success'
        AND occurred_at > datetime('now', '-24 hours')
    `).bind(failure.fingerprint).first<{ first_error_at: string }>();

    if (!firstError) continue;

    const firstErrorTime = new Date(firstError.first_error_at).getTime();
    const ageMinutes = (now.getTime() - firstErrorTime) / (1000 * 60);

    let requiredLevel = 0;
    if (ageMinutes >= l3Minutes) requiredLevel = 3;
    else if (ageMinutes >= l2Minutes) requiredLevel = 2;
    else if (ageMinutes >= l1Minutes) requiredLevel = 1;

    if (requiredLevel > 0) {
      await triggerEscalation(env, failure.fingerprint, requiredLevel, `Unacknowledged for ${Math.round(ageMinutes)} minutes`);
    }
  }
}

async function triggerEscalation(env: Env, fingerprint: string, level: number, reason: string) {
  const existing = await env.DB.prepare(
    `SELECT id, level, status FROM cleanup_alert_escalations WHERE fingerprint = ? AND status = 'active'`
  ).bind(fingerprint).first<{ id: string, level: number, status: string }>();

  if (existing && existing.level >= level) {
    return; // Already at this level or higher
  }

  const now = new Date().toISOString();
  
  if (existing) {
    // Upgrade level
    await env.DB.prepare(
      `UPDATE cleanup_alert_escalations SET level = ?, note = ? WHERE id = ?`
    ).bind(level, reason, existing.id).run();
  } else {
    // Insert new
    await env.DB.prepare(
      `INSERT INTO cleanup_alert_escalations (id, fingerprint, level, status, triggered_at, note) VALUES (?, ?, ?, 'active', ?, ?)`
    ).bind(crypto.randomUUID(), fingerprint, level, now, reason).run();
  }

  // Audit
  await insertAuditLog(env, {
    requestId: crypto.randomUUID(),
    actorUserId: 'system-cron',
    actorRole: 'system',
    action: 'export_cleanup_alert_escalation_trigger' as any,
    resourceType: 'cleanup_alert_escalation',
    resourceId: fingerprint,
    outcome: 'success',
    reason: `Triggered L${level} escalation`,
    changeSummaryJson: JSON.stringify({ level, reason })
  });

  
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

}

async function resolveEscalation(env: Env, fingerprint: string) {
  const now = new Date().toISOString();
  const res = await env.DB.prepare(
    `UPDATE cleanup_alert_escalations SET status = 'resolved', resolved_at = ? WHERE fingerprint = ? AND status = 'active'`
  ).bind(now, fingerprint).run();

  if (res.meta.changes > 0) {
    await insertAuditLog(env, {
      requestId: crypto.randomUUID(),
      actorUserId: 'system-cron',
      actorRole: 'system',
      action: 'export_cleanup_alert_escalation_resolve' as any,
      resourceType: 'cleanup_alert_escalation',
      resourceId: fingerprint,
      outcome: 'success',
      reason: 'Escalation resolved because alert is resolved',
      changeSummaryJson: '{}'
    });
  }
}
