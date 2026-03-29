import { D1Database } from "@cloudflare/workers-types";
import { CleanupFailureAlertResponseWithAck } from "../../types/adminAlerts";
import { Env } from "../../types/env";
import { insertCleanupAuditLog as insertAuditLog } from "./exportCleanupService";

const CLEANUP_ACTIONS = [
  "export_cleanup_run",
  "export_cleanup_token",
  "export_cleanup_object",
  "export_cleanup_reconcile",
  "export_cleanup_orphan"
];

async function sha256Hex(text: string) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function getCleanupFailureAlert(
  db: D1Database,
  adminUserId: string
): Promise<CleanupFailureAlertResponseWithAck> {
  const rangeHours = 24;
  const actionsList = CLEANUP_ACTIONS.map(a => `'${a}'`).join(',');

  const errorCountRes = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM audit_logs
    WHERE action IN (${actionsList})
      AND outcome = 'failed'
      AND created_at >= datetime('now', '-24 hours')
  `).first<{ count: number }>();
  const errorCount = errorCountRes?.count || 0;

  const lastErrorAtRes = await db.prepare(`
    SELECT MAX(created_at) AS last_error_at
    FROM audit_logs
    WHERE action IN (${actionsList})
      AND outcome = 'failed'
      AND created_at >= datetime('now', '-24 hours')
  `).first<{ last_error_at: string | null }>();
  const lastErrorAt = lastErrorAtRes?.last_error_at || null;

  const topReasonsRes = await db.prepare(`
    SELECT COALESCE(reason, 'unknown') AS reason, COUNT(*) AS count
    FROM audit_logs
    WHERE action IN (${actionsList})
      AND outcome = 'failed'
      AND created_at >= datetime('now', '-24 hours')
    GROUP BY reason
    ORDER BY count DESC
    LIMIT 3
  `).all<{ reason: string, count: number }>();
  
  const recentErrorsRes = await db.prepare(`
    SELECT id, created_at, action, resource_type, resource_id, reason, endpoint
    FROM audit_logs
    WHERE action IN (${actionsList})
      AND outcome = 'failed'
      AND created_at >= datetime('now', '-24 hours')
    ORDER BY created_at DESC
    LIMIT 5
  `).all<any>();

  const latestRunRes = await db.prepare(`
    SELECT outcome
    FROM audit_logs
    WHERE action = 'export_cleanup_run'
    ORDER BY created_at DESC
    LIMIT 1
  `).first<{ outcome: string }>();

  const latestRunOutcome = (latestRunRes?.outcome as any) || 'unknown';
  
  let severity: 'warning' | 'critical' | 'none' = 'none';
  if (errorCount > 0) severity = 'warning';
  if (errorCount > 10 || latestRunOutcome === 'failed') severity = 'critical';
  
  const topReason = topReasonsRes.results?.[0]?.reason || 'unknown';
  const fingerprintRaw = `${severity}-${topReason}-${new Date().toISOString().split('T')[0]}`;
  const fingerprint = errorCount > 0 ? await sha256Hex(fingerprintRaw) : null;
  
  let dismissed = false;
  let dismissedAt = null;
  if (fingerprint) {
    const d = await db.prepare(
      `SELECT dismissed_at FROM admin_alert_dismissals WHERE alert_type = 'cleanup-failure' AND fingerprint = ? AND admin_user_id = ?`
    ).bind(fingerprint, adminUserId).first<{ dismissed_at: string }>();
    if (d) {
      dismissed = true;
      dismissedAt = d.dismissed_at;
    }
  }

  let acknowledgment = null;
  if (fingerprint) {
    const ackRow = await db.prepare(
      "SELECT status, note, acknowledged_by_user_id, acknowledged_at, assignee_user_id, resolved_at, last_commented_at FROM cleanup_alert_acknowledgments WHERE fingerprint = ?"
    ).bind(fingerprint).first<any>();
    
    let commentCount = 0;
    const commentCountRow = await db.prepare(
      "SELECT COUNT(*) as count FROM cleanup_alert_comments WHERE fingerprint = ?"
    ).bind(fingerprint).first<{count: number}>();
    if (commentCountRow) commentCount = commentCountRow.count;

    if (ackRow) {
      acknowledgment = {
        exists: true,
        status: ackRow.status,
        acknowledgedByUserId: ackRow.acknowledged_by_user_id,
        acknowledgedAt: ackRow.acknowledged_at,
        note: ackRow.note,
        assigneeUserId: ackRow.assignee_user_id,
        resolvedAt: ackRow.resolved_at,
        lastCommentedAt: ackRow.last_commented_at,
        commentCount
      };
    } else {
      acknowledgment = {
        exists: false,
        status: null,
        acknowledgedByUserId: null,
        acknowledgedAt: null,
        note: null,
        assigneeUserId: null,
        resolvedAt: null,
        lastCommentedAt: null,
        commentCount
      };
    }
  }

  
  const slaQuery = await db.prepare(`
    SELECT sla_type, deadline_at, breached_at, notification_count, last_notified_at
    FROM cleanup_alert_sla_events
    WHERE fingerprint = ?
  `).bind(fingerprint).all();
  
  let ackDeadlineAt = null;
  let ackBreached = false;
  let resolveDeadlineAt = null;
  let resolveBreached = false;
  let renotifyCount = 0;
  let lastRenotifiedAt = null;

  if (slaQuery.success && slaQuery.results) {
    for (const row of slaQuery.results) {
      if (row.sla_type === 'ack') {
        ackDeadlineAt = row.deadline_at;
        ackBreached = !!row.breached_at;
      } else if (row.sla_type === 'resolve') {
        resolveDeadlineAt = row.deadline_at;
        resolveBreached = !!row.breached_at;
      }
      renotifyCount = Math.max(renotifyCount, row.notification_count || 0);
      if (row.last_notified_at) {
        if (!lastRenotifiedAt || new Date(row.last_notified_at) > new Date(lastRenotifiedAt)) {
          lastRenotifiedAt = row.last_notified_at;
        }
      }
    }
  }

  
  // SLA info
  if (acknowledgment) {
    (acknowledgment as any).sla = {
      ackDeadlineAt, ackBreached, resolveDeadlineAt, resolveBreached, renotifyCount, lastRenotifiedAt
    };
  }

  return {
    hasAlert: errorCount > 0,
    severity,
    rangeHours,
    errorCount,
    lastErrorAt,
    latestRunOutcome,
    topReasons: topReasonsRes.results || [],
    recentErrors: recentErrorsRes.results || [],
    fingerprint,
    dismissed,
    dismissedAt,
    detailUrl: '/admin/system?tab=cleanup',
    acknowledgment
  };
}

export async function dismissCleanupAlert(env: Env, adminUserId: string, fingerprint: string) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO admin_alert_dismissals (id, admin_user_id, alert_type, fingerprint, dismissed_at, created_at, updated_at)
     VALUES (?, ?, 'cleanup-failure', ?, ?, ?, ?)
     ON CONFLICT(admin_user_id, alert_type, fingerprint) DO UPDATE SET dismissed_at = excluded.dismissed_at, updated_at = excluded.updated_at`
  ).bind(crypto.randomUUID(), adminUserId, fingerprint, now, now, now).run();
  
  await insertAuditLog(env, {
    requestId: crypto.randomUUID(),
    actorUserId: adminUserId,
    actorRole: 'admin',
    action: 'export_cleanup_alert_dismiss' as any,
    resourceType: 'admin_alert_dismissals',
    resourceId: fingerprint,
    outcome: 'success',
    reason: 'Dismissed cleanup failure alert',
    changeSummaryJson: JSON.stringify({ fingerprint })
  });

  return { ok: true, fingerprint, dismissedAt: now };
}

export async function upsertCleanupAlertAcknowledgment(
  env: Env,
  userId: string,
  fingerprint: string,
  status: string,
  note?: string
) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO cleanup_alert_acknowledgments (id, alert_type, fingerprint, status, note, acknowledged_by_user_id, acknowledged_at, created_at, updated_at)
     VALUES (?, 'cleanup-failure', ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(fingerprint) DO UPDATE SET 
       status = excluded.status,
       note = excluded.note,
       updated_at = excluded.updated_at,
       resolved_at = CASE WHEN excluded.status = 'resolved' THEN excluded.updated_at ELSE cleanup_alert_acknowledgments.resolved_at END`
  ).bind(crypto.randomUUID(), fingerprint, status, note || null, userId, now, now, now).run();

  await insertAuditLog(env, {
    requestId: crypto.randomUUID(),
    actorUserId: userId,
    actorRole: 'admin',
    action: 'export_cleanup_alert_acknowledge' as any,
    resourceType: 'cleanup_alert_acknowledgment',
    resourceId: fingerprint,
    outcome: 'success',
    reason: `Acknowledged with status ${status}`,
    changeSummaryJson: JSON.stringify({ status, note })
  });

  return { status, note, acknowledgedByUserId: userId, acknowledgedAt: now };
}
