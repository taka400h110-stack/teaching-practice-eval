const fs = require('fs');
const path = require('path');

const serviceFile = path.join(__dirname, '../src/api/services/cleanupAlertService.ts');
let content = fs.readFileSync(serviceFile, 'utf8');

if (!content.includes('slaData')) {
  // Add SLA query logic
  const queryToInsert = `
  const slaQuery = await db.prepare(\`
    SELECT sla_type, deadline_at, breached_at, notification_count, last_notified_at
    FROM cleanup_alert_sla_events
    WHERE fingerprint = ?
  \`).bind(fingerprint).all();
  
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
`;

  // Insert before the return statement of getCleanupFailureAlert
  content = content.replace(
    'return {',
    queryToInsert + '\n  return {'
  );

  // Add the SLA fields to the returned object
  content = content.replace(
    'detailUrl: `https://example.com/admin/alerts/${fingerprint}`',
    'detailUrl: `https://example.com/admin/alerts/${fingerprint}`,\n    ackDeadlineAt,\n    ackBreached,\n    resolveDeadlineAt,\n    resolveBreached,\n    renotifyCount,\n    lastRenotifiedAt'
  );

  fs.writeFileSync(serviceFile, content);
  console.log('Updated getCleanupFailureAlert with SLA fields');
} else {
  console.log('SLA fields already present in cleanupAlertService.ts');
}
