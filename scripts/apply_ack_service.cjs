const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, '../src/api/services/cleanupAlertService.ts');
let content = fs.readFileSync(servicePath, 'utf8');

if (!content.includes('getCleanupAlertAcknowledgment')) {
  content += `
export async function getCleanupAlertAcknowledgment(
  db: D1Database,
  fingerprint: string
): Promise<import('../../types/adminAlerts').AlertAcknowledgment> {
  const row = await db.prepare(\`
    SELECT status, acknowledged_by_user_id, acknowledged_at, note
    FROM cleanup_alert_acknowledgments
    WHERE alert_type = 'cleanup_failure' AND fingerprint = ?
  \`).bind(fingerprint).first();

  if (row) {
    return {
      exists: true,
      status: row.status as any,
      acknowledgedByUserId: row.acknowledged_by_user_id as string,
      acknowledgedAt: row.acknowledged_at as string,
      note: row.note as string | null
    };
  }
  return {
    exists: false,
    status: null,
    acknowledgedByUserId: null,
    acknowledgedAt: null,
    note: null
  };
}

export async function upsertCleanupAlertAcknowledgment(
  env: Env,
  adminUserId: string,
  fingerprint: string,
  status: "acknowledged" | "investigating" | "resolved",
  note?: string
) {
  const db = env.DB;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get old status for audit log
  const oldAck = await getCleanupAlertAcknowledgment(db, fingerprint);
  const oldStatus = oldAck.exists ? oldAck.status : null;

  await db.prepare(\`
    INSERT INTO cleanup_alert_acknowledgments (id, alert_type, fingerprint, status, acknowledged_by_user_id, acknowledged_at, note, created_at, updated_at)
    VALUES (?, 'cleanup_failure', ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(alert_type, fingerprint) DO UPDATE SET
      status = excluded.status,
      acknowledged_by_user_id = excluded.acknowledged_by_user_id,
      acknowledged_at = excluded.acknowledged_at,
      note = excluded.note,
      updated_at = excluded.updated_at
  \`).bind(id, fingerprint, status, adminUserId, now, note || null, now, now).run();

  await insertCleanupAuditLog(env, {
    action: oldAck.exists ? "export_cleanup_alert_ack_update" : "export_cleanup_alert_acknowledge",
    resourceType: "cleanup_alert",
    resourceId: fingerprint,
    outcome: "success",
    actorUserId: adminUserId,
    changeSummary: {
      alertType: 'cleanup_failure',
      oldStatus,
      newStatus: status,
      note
    }
  });

  return await getCleanupAlertAcknowledgment(db, fingerprint);
}
`;
  
  // Update getCleanupFailureAlert signature and return
  content = content.replace(
    `export async function getCleanupFailureAlert(db: D1Database, env: Env): Promise<CleanupFailureAlertResponse>`,
    `export async function getCleanupFailureAlert(db: D1Database, env: Env): Promise<import('../../types/adminAlerts').CleanupFailureAlertResponseWithAck>`
  );

  content = content.replace(
    `return {\n    hasAlert,\n    severity,\n    rangeHours: 24,`,
    `const acknowledgment = fingerprint ? await getCleanupAlertAcknowledgment(db, fingerprint) : null;\n  return {\n    hasAlert,\n    severity,\n    rangeHours: 24,\n    acknowledgment,`
  );

  fs.writeFileSync(servicePath, content);
}
console.log("Updated cleanupAlertService");
