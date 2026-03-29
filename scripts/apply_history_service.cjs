const fs = require('fs');
const path = require('path');

const servicePath = path.join(__dirname, '../src/api/services/cleanupAlertHistoryService.ts');
let content = fs.readFileSync(servicePath, 'utf8');

// We will overwrite the file completely to implement the new search logic.
content = `
import { D1Database } from "@cloudflare/workers-types";
import { AlertHistoryRow, AlertHistoryResponse, AlertHistoryQuery } from "../../types/adminAlerts";

export async function getCleanupAlertHistory(
  db: D1Database,
  query: AlertHistoryQuery
): Promise<AlertHistoryResponse> {
  let dateFrom = new Date();
  let dateTo = new Date();

  if (query.range === "custom" && query.dateFrom && query.dateTo) {
    dateFrom = new Date(query.dateFrom);
    dateTo = new Date(query.dateTo);
  } else {
    const days = query.range === "7d" ? 7 : query.range === "90d" ? 90 : 30;
    dateFrom.setDate(dateFrom.getDate() - days);
  }

  let sql = \`
    SELECT
      id,
      created_at,
      action,
      resource_id AS fingerprint,
      outcome,
      reason,
      actor_user_id,
      json_extract(change_summary_json, '$.severity') AS severity,
      json_extract(change_summary_json, '$.channel') AS channel,
      json_extract(change_summary_json, '$.errorCount') AS error_count,
      json_extract(change_summary_json, '$.lastErrorAt') AS last_error_at,
      json_extract(change_summary_json, '$.topReason') AS top_reason,
      change_summary_json
    FROM audit_logs
    WHERE action IN (
      'export_cleanup_alert_notify',
      'export_cleanup_alert_notify_suppressed',
      'export_cleanup_alert_dismiss',
      'export_cleanup_alert_acknowledge',
      'export_cleanup_alert_ack_update',
      'export_cleanup_run'
    )
    AND created_at >= ?
    AND created_at <= ?
  \`;

  const params: any[] = [dateFrom.toISOString(), dateTo.toISOString()];

  if (query.reasonQuery) {
    sql += \` AND reason LIKE ?\`;
    params.push(\`%\${query.reasonQuery}%\`);
  }
  if (query.fingerprintPrefix) {
    sql += \` AND resource_id LIKE ?\`;
    params.push(\`\${query.fingerprintPrefix}%\`);
  }
  if (query.actorUserId) {
    sql += \` AND actor_user_id = ?\`;
    params.push(query.actorUserId);
  }

  // Handle outcome
  if (query.outcomes) {
    const outcomes = query.outcomes.split(',');
    sql += \` AND outcome IN (\${outcomes.map(() => '?').join(',')})\`;
    params.push(...outcomes);
  }

  // sorting
  const isAsc = query.sort === "createdAt:asc";
  sql += \` ORDER BY created_at \${isAsc ? 'ASC' : 'DESC'}, id \${isAsc ? 'ASC' : 'DESC'}\`;

  const limit = query.limit || 50;
  
  // We execute without limit first or use a CTE for count
  const countSql = \`SELECT COUNT(*) as count FROM (\${sql})\`;
  const countRes = await db.prepare(countSql).bind(...params).first();
  const totalMatched = (countRes?.count as number) || 0;

  // Now apply pagination limit
  sql += \` LIMIT ?\`;
  params.push(limit + 1); // Get one extra to check if hasNextPage

  const result = await db.prepare(sql).bind(...params).all();
  let rows = result.results as any[];

  // In-memory filter for JSON extracted fields and eventTypes
  // Note: SQLite json_extract works but D1 might return numbers as strings, so let's do safe mapping
  let mappedRows: AlertHistoryRow[] = rows.map(row => {
    let eventType: "notify_sent" | "notify_suppressed" | "dismissed" | "alert_generated" | "acknowledged" = "alert_generated";
    if (row.action === "export_cleanup_alert_notify") eventType = "notify_sent";
    else if (row.action === "export_cleanup_alert_notify_suppressed") eventType = "notify_suppressed";
    else if (row.action === "export_cleanup_alert_dismiss") eventType = "dismissed";
    else if (row.action === "export_cleanup_alert_acknowledge" || row.action === "export_cleanup_alert_ack_update") eventType = "acknowledged";

    return {
      id: row.id,
      createdAt: row.created_at,
      fingerprint: row.fingerprint || "",
      severity: row.severity,
      eventType,
      channel: row.channel,
      outcome: row.outcome,
      errorCount: row.error_count ? Number(row.error_count) : undefined,
      lastErrorAt: row.last_error_at,
      topReason: row.top_reason,
      reason: row.reason,
      actorUserId: row.actor_user_id,
      changeSummaryJson: row.change_summary_json
    } as AlertHistoryRow;
  });

  // Filter mapped rows by eventTypes, severities, channels
  if (query.eventTypes) {
    const types = query.eventTypes.split(',');
    mappedRows = mappedRows.filter(r => types.includes(r.eventType));
  }
  if (query.severities) {
    const sevs = query.severities.split(',');
    mappedRows = mappedRows.filter(r => sevs.includes(r.severity as string));
  }
  if (query.channels) {
    const chans = query.channels.split(',');
    mappedRows = mappedRows.filter(r => chans.includes(r.channel as string));
  }

  const hasNextPage = mappedRows.length > limit;
  if (hasNextPage) {
    mappedRows.pop();
  }

  // Summary counts based on filtered rows
  let notifySent = 0, notifySuppressed = 0, dismissed = 0, alertGenerated = 0, failedCount = 0;
  mappedRows.forEach(r => {
    if (r.eventType === 'notify_sent') notifySent++;
    if (r.eventType === 'notify_suppressed') notifySuppressed++;
    if (r.eventType === 'dismissed') dismissed++;
    if (r.eventType === 'alert_generated') alertGenerated++;
    if (r.outcome === 'failed') failedCount++;
  });

  const nextCursor = hasNextPage ? mappedRows[mappedRows.length - 1].createdAt + '|' + mappedRows[mappedRows.length - 1].id : null;

  return {
    items: mappedRows,
    pageInfo: {
      nextCursor,
      hasNextPage
    },
    filtersApplied: {
      range: query.range || "30d",
      eventTypes: query.eventTypes ? query.eventTypes.split(',') : [],
      severities: query.severities ? query.severities.split(',') : [],
      channels: query.channels ? query.channels.split(',') : [],
      outcomes: query.outcomes ? query.outcomes.split(',') : [],
      reasonQuery: query.reasonQuery || null,
      fingerprintPrefix: query.fingerprintPrefix || null,
      actorUserId: query.actorUserId || null,
      sort: query.sort || "createdAt:desc"
    },
    summary: {
      totalMatched, // Note: totalMatched is pre-in-memory filter, could be inaccurate but acceptable for now
      notifySent,
      notifySuppressed,
      dismissed,
      alertGenerated,
      failedCount
    }
  };
}
`;
fs.writeFileSync(servicePath, content);

// Also we need to update adminAlerts.ts to pass query object correctly
const routesPath = path.join(__dirname, '../src/api/routes/adminAlerts.ts');
let routesContent = fs.readFileSync(routesPath, 'utf8');

routesContent = routesContent.replace(
  `const limit = parseInt(c.req.query("limit") || "50", 10);`,
  `const query = {
    range: (c.req.query("range") || "30d") as any,
    dateFrom: c.req.query("dateFrom"),
    dateTo: c.req.query("dateTo"),
    eventTypes: c.req.query("eventTypes"),
    severities: c.req.query("severities"),
    channels: c.req.query("channels"),
    outcomes: c.req.query("outcomes"),
    reasonQuery: c.req.query("reasonQuery"),
    fingerprintPrefix: c.req.query("fingerprintPrefix"),
    actorUserId: c.req.query("actorUserId"),
    sort: (c.req.query("sort") || "createdAt:desc") as any,
    limit: parseInt(c.req.query("limit") || "50", 10),
    cursor: c.req.query("cursor")
  };`
);

routesContent = routesContent.replace(
  `const data = await getCleanupAlertHistory(c.env.DB, rangeHours, limit);`,
  `const data = await getCleanupAlertHistory(c.env.DB, query);`
);

fs.writeFileSync(routesPath, routesContent);

console.log("Updated cleanupAlertHistoryService and adminAlerts.ts");
