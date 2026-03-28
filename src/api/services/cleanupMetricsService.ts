import { D1Database } from "@cloudflare/workers-types";
import { CleanupMetricsResponse, CleanupDailyPoint, CleanupRunRow, CleanupErrorRow } from "../../types/adminMetrics";

const CLEANUP_ACTIONS = [
  "export_cleanup_run",
  "export_cleanup_token",
  "export_cleanup_object",
  "export_cleanup_reconcile",
  "export_cleanup_orphan",
] as const;

export async function getCleanupMetrics(
  db: D1Database,
  range: "7d" | "30d"
): Promise<CleanupMetricsResponse> {
  const days = range === "30d" ? 30 : 7;
  const timeModifier = `-${days} days`;

  // 1. Summary
  const summaryQuery = `
    SELECT
      COUNT(*) AS executions,
      COALESCE(SUM(CAST(json_extract(change_summary_json, '$.expiredTokensDeleted') AS INTEGER)), 0) AS deleted_tokens,
      COALESCE(SUM(CAST(json_extract(change_summary_json, '$.exportObjectsDeleted') AS INTEGER)), 0) AS deleted_objects,
      COALESCE(SUM(CAST(json_extract(change_summary_json, '$.orphanObjectsDeleted') AS INTEGER)), 0) AS deleted_orphans,
      COALESCE(SUM(
        COALESCE(CAST(json_extract(change_summary_json, '$.expiredTokensDeleted') AS INTEGER), 0) +
        COALESCE(CAST(json_extract(change_summary_json, '$.exportObjectsDeleted') AS INTEGER), 0) +
        COALESCE(CAST(json_extract(change_summary_json, '$.orphanObjectsDeleted') AS INTEGER), 0)
      ), 0) AS deleted_total,
      MAX(created_at) AS last_run_at
    FROM audit_logs
    WHERE action = 'export_cleanup_run'
      AND created_at >= datetime('now', ?);
  `;
  const summaryResult = await db.prepare(summaryQuery).bind(timeModifier).first();

  // 2. Error Summary
  const errorSummaryQuery = `
    SELECT COUNT(*) AS errors
    FROM audit_logs
    WHERE action IN ('export_cleanup_run', 'export_cleanup_token', 'export_cleanup_object', 'export_cleanup_reconcile', 'export_cleanup_orphan')
      AND outcome = 'failed'
      AND created_at >= datetime('now', ?);
  `;
  const errorSummaryResult = await db.prepare(errorSummaryQuery).bind(timeModifier).first();

  // 3. Last Run Outcome
  const lastRunQuery = `
    SELECT outcome
    FROM audit_logs
    WHERE action = 'export_cleanup_run'
    ORDER BY created_at DESC
    LIMIT 1;
  `;
  const lastRunResult = await db.prepare(lastRunQuery).first();
  const lastRunOutcome = (lastRunResult?.outcome as "success" | "partial" | "failed") || "unknown";

  // 4. Daily Series
  const dailySeriesQuery = `
    SELECT
      date(created_at) AS day,
      COUNT(*) AS executions,
      COALESCE(SUM(CAST(json_extract(change_summary_json, '$.expiredTokensDeleted') AS INTEGER)), 0) AS deleted_tokens,
      COALESCE(SUM(CAST(json_extract(change_summary_json, '$.exportObjectsDeleted') AS INTEGER)), 0) AS deleted_objects,
      COALESCE(SUM(CAST(json_extract(change_summary_json, '$.orphanObjectsDeleted') AS INTEGER)), 0) AS deleted_orphans,
      COALESCE(SUM(
        COALESCE(CAST(json_extract(change_summary_json, '$.expiredTokensDeleted') AS INTEGER), 0) +
        COALESCE(CAST(json_extract(change_summary_json, '$.exportObjectsDeleted') AS INTEGER), 0) +
        COALESCE(CAST(json_extract(change_summary_json, '$.orphanObjectsDeleted') AS INTEGER), 0)
      ), 0) AS deleted_total
    FROM audit_logs
    WHERE action = 'export_cleanup_run'
      AND created_at >= datetime('now', ?)
    GROUP BY date(created_at)
    ORDER BY day ASC;
  `;
  const dailySeriesResult = await db.prepare(dailySeriesQuery).bind(timeModifier).all();

  // 5. Daily Errors Series
  const dailyErrorsQuery = `
    SELECT
      date(created_at) AS day,
      COUNT(*) AS errors
    FROM audit_logs
    WHERE action IN ('export_cleanup_run', 'export_cleanup_token', 'export_cleanup_object', 'export_cleanup_reconcile', 'export_cleanup_orphan')
      AND outcome = 'failed'
      AND created_at >= datetime('now', ?)
    GROUP BY date(created_at)
    ORDER BY day ASC;
  `;
  const dailyErrorsResult = await db.prepare(dailyErrorsQuery).bind(timeModifier).all();

  // 6. Recent Runs
  const recentRunsQuery = `
    SELECT
      id,
      created_at,
      json_extract(change_summary_json, '$.cron') AS cron,
      outcome,
      COALESCE(CAST(json_extract(change_summary_json, '$.expiredTokensDeleted') AS INTEGER), 0) AS deleted_tokens,
      COALESCE(CAST(json_extract(change_summary_json, '$.exportObjectsDeleted') AS INTEGER), 0) AS deleted_objects,
      COALESCE(CAST(json_extract(change_summary_json, '$.orphanObjectsDeleted') AS INTEGER), 0) AS deleted_orphans,
      CAST(json_extract(change_summary_json, '$.dryRun') AS INTEGER) AS dry_run,
      COALESCE(CAST(json_extract(change_summary_json, '$.errorCount') AS INTEGER), 0) AS errors
    FROM audit_logs
    WHERE action = 'export_cleanup_run'
    ORDER BY created_at DESC
    LIMIT 20;
  `;
  const recentRunsResult = await db.prepare(recentRunsQuery).all();

  // 7. Recent Errors
  const recentErrorsQuery = `
    SELECT
      id,
      created_at,
      action,
      resource_type,
      resource_id,
      reason,
      endpoint
    FROM audit_logs
    WHERE action IN ('export_cleanup_run', 'export_cleanup_token', 'export_cleanup_object', 'export_cleanup_reconcile', 'export_cleanup_orphan')
      AND outcome = 'failed'
    ORDER BY created_at DESC
    LIMIT 20;
  `;
  const recentErrorsResult = await db.prepare(recentErrorsQuery).all();

  // Process Daily Series (Zero filling)
  const today = new Date();
  const seriesMap = new Map<string, CleanupDailyPoint>();
  
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    seriesMap.set(dateStr, {
      date: dateStr,
      executions: 0,
      deletedTotal: 0,
      deletedTokens: 0,
      deletedObjects: 0,
      deletedOrphans: 0,
      errors: 0,
    });
  }

  for (const row of dailySeriesResult.results as any[]) {
    const point = seriesMap.get(row.day);
    if (point) {
      point.executions = Number(row.executions);
      point.deletedTotal = Number(row.deleted_total);
      point.deletedTokens = Number(row.deleted_tokens);
      point.deletedObjects = Number(row.deleted_objects);
      point.deletedOrphans = Number(row.deleted_orphans);
    }
  }

  for (const row of dailyErrorsResult.results as any[]) {
    const point = seriesMap.get(row.day);
    if (point) {
      point.errors = Number(row.errors);
    }
  }

  const dailySeries = Array.from(seriesMap.values());

  return {
    range,
    generatedAt: new Date().toISOString(),
    summary: {
      executions: Number(summaryResult?.executions || 0),
      deletedTotal: Number(summaryResult?.deleted_total || 0),
      deletedTokens: Number(summaryResult?.deleted_tokens || 0),
      deletedObjects: Number(summaryResult?.deleted_objects || 0),
      deletedOrphans: Number(summaryResult?.deleted_orphans || 0),
      errors: Number(errorSummaryResult?.errors || 0),
      lastRunAt: (summaryResult?.last_run_at as string) || null,
      lastRunOutcome,
    },
    dailySeries,
    recentRuns: recentRunsResult.results.map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      cron: r.cron,
      outcome: r.outcome,
      deletedTokens: Number(r.deleted_tokens),
      deletedObjects: Number(r.deleted_objects),
      deletedOrphans: Number(r.deleted_orphans),
      errors: Number(r.errors),
      dryRun: Boolean(r.dry_run),
    })),
    recentErrors: recentErrorsResult.results.map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      action: r.action,
      resourceType: r.resource_type,
      resourceId: r.resource_id,
      reason: r.reason,
      endpoint: r.endpoint,
    })),
  };
}
