import { Env } from '../../types/env';
import { insertCleanupAuditLog as insertAuditLog } from './exportCleanupService';

export interface SlaEvent {
  id: string;
  fingerprint: string;
  severity: string;
  sla_type: 'ack' | 'resolve';
  deadline_at: string;
  breached_at: string | null;
  status: 'pending' | 'breached' | 'resolved';
  notification_count: number;
  last_notified_at: string | null;
}

export async function calculateSlaDeadline(env: Env, severity: string, slaType: 'ack' | 'resolve', createdAt: string): Promise<string | null> {
  if (env.CLEANUP_ALERT_SLA_ENABLED !== 'true') return null;

  let minutes = 0;
  if (slaType === 'ack') {
    minutes = severity === 'critical' ? 
      parseInt(env.CLEANUP_ALERT_SLA_ACK_CRITICAL_MINUTES || '15', 10) : 
      parseInt(env.CLEANUP_ALERT_SLA_ACK_WARNING_MINUTES || '60', 10);
  } else {
    minutes = severity === 'critical' ? 
      parseInt(env.CLEANUP_ALERT_SLA_RESOLVE_CRITICAL_MINUTES || '240', 10) : 
      parseInt(env.CLEANUP_ALERT_SLA_RESOLVE_WARNING_MINUTES || '1440', 10);
  }

  return new Date(new Date(createdAt).getTime() + minutes * 60000).toISOString();
}

export async function upsertSlaEvent(env: Env, fingerprint: string, severity: string, slaType: 'ack' | 'resolve', deadlineAt: string) {
  await env.DB.prepare(`
    INSERT INTO cleanup_alert_sla_events 
      (id, fingerprint, severity, sla_type, deadline_at, status, notification_count, created_at, updated_at)
    VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 'pending', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(fingerprint, sla_type) DO UPDATE SET
      deadline_at = excluded.deadline_at,
      severity = excluded.severity,
      updated_at = CURRENT_TIMESTAMP
  `).bind(fingerprint, severity, slaType, deadlineAt).run();
}

export async function checkAndBreachSla(env: Env) {
  if (env.CLEANUP_ALERT_SLA_ENABLED !== 'true') return;

  const pendingSlas = await env.DB.prepare(`
    SELECT * FROM cleanup_alert_sla_events 
    WHERE status = 'pending' AND datetime(deadline_at) < datetime('now')
  `).all<SlaEvent>();

  for (const sla of pendingSlas.results) {
    await env.DB.prepare(`
      UPDATE cleanup_alert_sla_events 
      SET status = 'breached', breached_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(sla.id).run();

    await insertAuditLog(env, {
      action: 'export_cleanup_alert_sla_breach',
      actor_user_id: 'system',
      resource_type: 'cleanup_alert_sla_event',
      resource_id: sla.id,
      details: { fingerprint: sla.fingerprint, sla_type: sla.sla_type, severity: sla.severity }
    });
  }
}

export async function getSlaEventsForAlert(env: Env, fingerprint: string) {
  const result = await env.DB.prepare(`
    SELECT * FROM cleanup_alert_sla_events WHERE fingerprint = ? ORDER BY created_at ASC
  `).bind(fingerprint).all<SlaEvent>();
  return result.results;
}

export async function resolveSla(env: Env, fingerprint: string, slaType: 'ack' | 'resolve') {
  await env.DB.prepare(`
    UPDATE cleanup_alert_sla_events 
    SET status = 'resolved', updated_at = CURRENT_TIMESTAMP 
    WHERE fingerprint = ? AND sla_type = ? AND status != 'resolved'
  `).bind(fingerprint, slaType).run();
}
