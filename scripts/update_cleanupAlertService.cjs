const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/services/cleanupAlertService.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Add imports
if (!content.includes('import { insertCleanupAuditLog }')) {
  content = content.replace(
    'import { CleanupFailureAlertResponse } from "../../types/adminAlerts";',
    'import { CleanupFailureAlertResponse } from "../../types/adminAlerts";\nimport { insertCleanupAuditLog } from "./exportCleanupService";\nimport { Env } from "../../types/env";'
  );
}

// Modify return value
content = content.replace(
  'dismissed: false, // Handled on frontend',
  'dismissed,\n    dismissedAt,'
);

// Add logic to check dismiss status
content = content.replace(
  'return {',
  `let dismissed = false;
  let dismissedAt: string | null = null;
  if (fingerprint && adminUserId !== 'system') {
    const dismissRes = await db.prepare(\`
      SELECT dismissed_at FROM admin_alert_dismissals
      WHERE admin_user_id = ? AND alert_type = 'cleanup_failure' AND fingerprint = ?
    \`).bind(adminUserId, fingerprint).first<{ dismissed_at: string }>();
    if (dismissRes) {
      dismissed = true;
      dismissedAt = dismissRes.dismissed_at;
    }
  }

  return {`
);

// Add dismiss function
content += `
export async function dismissCleanupAlert(
  env: Env,
  adminUserId: string,
  fingerprint: string
): Promise<{ ok: boolean, fingerprint: string, dismissedAt: string }> {
  const dismissedAt = new Date().toISOString();
  await env.DB.prepare(\`
    INSERT INTO admin_alert_dismissals (id, admin_user_id, alert_type, fingerprint, dismissed_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(admin_user_id, alert_type, fingerprint) DO UPDATE SET
      dismissed_at = excluded.dismissed_at,
      updated_at = CURRENT_TIMESTAMP
  \`).bind(crypto.randomUUID(), adminUserId, 'cleanup_failure', fingerprint, dismissedAt).run();

  await insertCleanupAuditLog(env, {
    action: "export_cleanup_alert_dismiss",
    resourceType: "cleanup_alert",
    resourceId: fingerprint,
    outcome: "success",
    actorUserId: adminUserId,
    changeSummary: {
      alertType: 'cleanup_failure',
      dismissedAt
    }
  });

  return { ok: true, fingerprint, dismissedAt };
}
`;

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Updated cleanupAlertService.ts');
