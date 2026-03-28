import { Env } from "../../types/env";

export type CleanupSummary = {
  cron: string;
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;

  expiredTokensScanned: number;
  expiredTokensDeleted: number;

  exportRequestsScanned: number;
  exportObjectsDeleted: number;
  exportRowsUpdated: number;

  missingObjectsDetected: number;
  orphanObjectsDeleted: number;

  errors: Array<{
    phase: string;
    resourceId?: string;
    objectKey?: string;
    message: string;
  }>;
};

export async function insertCleanupAuditLog(env: Env, data: any) {
  const actorId = env.AUDIT_SYSTEM_ACTOR_ID || "system-cron";
  const actorRole = env.AUDIT_SYSTEM_ACTOR_ROLE || "system";
  
  if (env.EXPORT_CLEANUP_DRY_RUN === "true") {
    data.reason = (data.reason ? data.reason + " (dry_run)" : "dry_run");
  }

  // Fallback direct insert if performAudit isn't well adapted for cron
  const id = crypto.randomUUID();
  const stmt = env.DB.prepare(`
    INSERT INTO audit_logs (
      id,
      request_id,
      actor_user_id,
      actor_role,
      action,
      resource_type,
      resource_id,
      outcome,
      reason,
      change_summary_json,
      http_method,
      endpoint,
      status_code,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  await stmt.bind(
    id,
    data.requestId || "cron",
    actorId,
    actorRole,
    data.action,
    data.resourceType,
    data.resourceId || "",
    data.outcome,
    data.reason || "",
    data.changeSummary ? JSON.stringify(data.changeSummary) : null,
    "CRON",
    "system-job",
    200
  ).run();
}

export async function cleanupExpiredDownloadTokens(env: Env, nowIso: string, summary: CleanupSummary) {
  const batchSize = Number(env.EXPORT_CLEANUP_BATCH_SIZE || "100");
  const usedHours = env.EXPORT_USED_TOKEN_RETENTION_HOURS || "72";

  try {
    const rows = await env.DB.prepare(`
      SELECT id, export_request_id, expires_at, used_at, is_revoked
      FROM dataset_download_tokens
      WHERE
        cleanup_completed_at IS NULL AND
        (
          (expires_at IS NOT NULL AND expires_at < ?, ?, ?, ?)
          OR
          (used_at IS NOT NULL AND used_at < datetime(?, '-' || ? || ' hours'))
          OR
          (is_revoked = 1 AND updated_at < datetime(?, '-' || ? || ' hours'))
        )
      LIMIT ?
    `)
      .bind(nowIso, nowIso, usedHours, nowIso, usedHours, batchSize)
      .all();

    const items = rows.results ?? [];
    summary.expiredTokensScanned += items.length;

    for (const row of items) {
      try {
        if (env.EXPORT_CLEANUP_DRY_RUN !== "true") {
          await env.DB.prepare(`
            UPDATE dataset_download_tokens 
            SET cleanup_completed_at = ?, cleanup_reason = 'expired_or_used_cleanup'
            WHERE id = ?
          `).bind(nowIso, row.id).run();
        }

        await insertCleanupAuditLog(env, {
          action: "export_cleanup_token",
          resourceType: "dataset_download_token",
          resourceId: row.id as string,
          outcome: "success",
          reason: "expired_or_used_cleanup"
        });

        summary.expiredTokensDeleted++;
      } catch (error: any) {
        summary.errors.push({ phase: 'token_cleanup', resourceId: row.id as string, message: String(error) });
        await insertCleanupAuditLog(env, {
          action: "export_cleanup_token",
          resourceType: "dataset_download_token",
          resourceId: row.id as string,
          outcome: "failed",
          reason: String(error)
        });
      }
    }
  } catch (error: any) {
    summary.errors.push({ phase: 'token_cleanup_scan', message: String(error) });
  }
}

export async function cleanupExpiredExportObjects(env: Env, nowIso: string, summary: CleanupSummary) {
  const batchSize = Number(env.EXPORT_CLEANUP_BATCH_SIZE || "100");
  const normalDays = env.EXPORT_OBJECT_RETENTION_DAYS || "30";
  const rawHours = env.RAW_EXPORT_RETENTION_HOURS || "24";

  try {
    const rows = await env.DB.prepare(`
      SELECT id, export_object_key, request_type, approved_anonymization_level, status
      FROM dataset_export_requests
      WHERE
        (
          status IN ('revoked', 'expired', 'deleted', 'rejected') 
          AND export_object_key IS NOT NULL 
          AND deleted_at IS NULL
        )
        OR
        (
          (request_type = 'raw_access' OR approved_anonymization_level = 'raw')
          AND export_generated_at < datetime(?, '-' || ? || ' hours')
          AND deleted_at IS NULL
        )
        OR
        (
          expires_at IS NOT NULL AND expires_at < ?
          AND deleted_at IS NULL
        )
        OR
        (
          export_generated_at < datetime(?, '-' || ? || ' days')
          AND deleted_at IS NULL
        )
      LIMIT ?
    `)
      .bind(nowIso, rawHours, nowIso, nowIso, normalDays, batchSize)
      .all();

    const items = rows.results ?? [];
    summary.exportRequestsScanned += items.length;

    for (const row of items) {
      try {
        const objectKey = row.export_object_key as string;
        
        let head = null;
        if (objectKey) {
          head = await env.EXPORTS_BUCKET.head(objectKey);
          if (head && env.EXPORT_CLEANUP_DRY_RUN !== "true") {
            await env.EXPORTS_BUCKET.delete(objectKey);
            summary.exportObjectsDeleted++;
          }
        }

        const missing = objectKey && !head;
        if (missing) {
          summary.missingObjectsDetected++;
        }

        if (env.EXPORT_CLEANUP_DRY_RUN !== "true") {
          await env.DB.prepare(`
            UPDATE dataset_export_requests 
            SET deleted_at = ?, status = ?, cleanup_reason = ?
            WHERE id = ?
          `).bind(
            nowIso, 
            missing ? 'missing_object' : 'deleted',
            missing ? 'r2_object_not_found' : 'expired_cleanup',
            row.id
          ).run();
        }

        await insertCleanupAuditLog(env, {
          action: "export_cleanup_object",
          resourceType: "dataset_export_request",
          resourceId: row.id as string,
          outcome: "success",
          reason: missing ? 'r2_object_not_found' : 'expired_cleanup',
          changeSummary: {
            objectKey,
            deletion_mode: 'scheduled_cleanup',
            anonymization_level: row.approved_anonymization_level
          }
        });

        summary.exportRowsUpdated++;
      } catch (error: any) {
        summary.errors.push({ phase: 'object_cleanup', resourceId: row.id as string, message: String(error) });
        await insertCleanupAuditLog(env, {
          action: "export_cleanup_object",
          resourceType: "dataset_export_request",
          resourceId: row.id as string,
          outcome: "failed",
          reason: String(error)
        });
      }
    }
  } catch (error: any) {
    summary.errors.push({ phase: 'object_cleanup_scan', message: String(error) });
  }
}

export async function reconcileMissingExportObjects(env: Env, nowIso: string, summary: CleanupSummary) {
  // Find generated objects in D1, verify if they exist in R2
  const batchSize = Number(env.EXPORT_CLEANUP_BATCH_SIZE || "100");

  try {
    const rows = await env.DB.prepare(`
      SELECT id, export_object_key, status
      FROM dataset_export_requests
      WHERE status IN ('completed', 'generated') AND export_object_key IS NOT NULL AND deleted_at IS NULL
      ORDER BY last_cleanup_at ASC NULLS FIRST
      LIMIT ?
    `).bind(batchSize).all();

    const items = rows.results ?? [];
    for (const row of items) {
      try {
        const objectKey = row.export_object_key as string;
        if (!objectKey.startsWith("data:")) { // Ignore legacy base64 mock
          const head = await env.EXPORTS_BUCKET.head(objectKey);
          
          if (!head) {
            summary.missingObjectsDetected++;
            
            if (env.EXPORT_CLEANUP_DRY_RUN !== "true") {
              await env.DB.prepare(`
                UPDATE dataset_export_requests 
                SET status = 'missing_object', cleanup_reason = 'r2_object_not_found', deleted_at = ?
                WHERE id = ?
              `).bind(nowIso, row.id).run();
            }

            await insertCleanupAuditLog(env, {
              action: "export_cleanup_reconcile",
              resourceType: "dataset_export_request",
              resourceId: row.id as string,
              outcome: "success",
              reason: "r2_object_not_found",
              changeSummary: { objectKey }
            });
          } else {
            // Update last_cleanup_at so we don't scan it forever
            if (env.EXPORT_CLEANUP_DRY_RUN !== "true") {
              await env.DB.prepare(`
                UPDATE dataset_export_requests 
                SET last_cleanup_at = ?
                WHERE id = ?
              `).bind(nowIso, row.id).run();
            }
          }
        }
      } catch (error: any) {
         summary.errors.push({ phase: 'reconcile_missing', resourceId: row.id as string, message: String(error) });
      }
    }
  } catch (error: any) {
    summary.errors.push({ phase: 'reconcile_scan', message: String(error) });
  }
}
