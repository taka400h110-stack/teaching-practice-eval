const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/services/cleanupAlertService.ts');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('assignee_user_id')) {
  // Update the getCleanupFailureAlert return type to include acknowledgment with new fields
  
  const functionStart = content.indexOf('export async function getCleanupFailureAlert');
  const functionEnd = content.indexOf('export async function getDismissedCleanupAlert');
  
  let functionCode = content.substring(functionStart, functionEnd);
  
  // Look for the part where it returns the response
  const returnIndex = functionCode.indexOf('return {');
  
  const getAckCode = `
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
  `;
  
  const modifiedReturn = getAckCode + `\n  return {` + functionCode.substring(returnIndex + 8).replace('};', '    acknowledgment\n  };');
  
  content = content.replace(functionCode, 'export async function getCleanupFailureAlert' + functionCode.substring(44, returnIndex) + modifiedReturn);
  
  fs.writeFileSync(filePath, content);
  console.log('Updated getCleanupFailureAlert to include acknowledgment fields');
}

// Update upsertCleanupAlertAcknowledgment to handle resolved_at
if (!content.includes('resolved_at = ')) {
  content = content.replace(
    'note = excluded.note',
    "note = excluded.note, resolved_at = excluded.status = 'resolved' ? excluded.updated_at : excluded.resolved_at"
  );
  content = content.replace(
    /VALUES \(\?, \?, \?, \?, \?, \?, \?\)/,
    "VALUES (?, ?, ?, ?, ?, ?, ?)\n     ON CONFLICT(fingerprint) DO UPDATE SET \n       status = excluded.status,\n       note = excluded.note,\n       updated_at = excluded.updated_at,\n       resolved_at = CASE WHEN excluded.status = 'resolved' THEN excluded.updated_at ELSE cleanup_alert_acknowledgments.resolved_at END"
  );
  fs.writeFileSync(filePath, content);
  console.log('Updated upsertCleanupAlertAcknowledgment for resolved_at');
}

