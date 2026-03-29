import { Env } from "../../types/env";
import { insertCleanupAuditLog as insertAuditLog } from "./exportCleanupService";

export interface CommentRow {
  id: string;
  fingerprint: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

export async function getComments(env: Env, fingerprint: string): Promise<CommentRow[]> {
  const result = await env.DB.prepare(
    `SELECT id, fingerprint, user_id, comment_text, created_at, updated_at 
     FROM cleanup_alert_comments 
     WHERE fingerprint = ? 
     ORDER BY created_at ASC`
  ).bind(fingerprint).all<CommentRow>();
  return result.results || [];
}

export async function addComment(env: Env, fingerprint: string, userId: string, commentText: string): Promise<CommentRow> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // ensure comment text is plain text and short
  const safeText = commentText.trim().substring(0, 2000);
  
  if (!safeText) {
    throw new Error('Comment text cannot be empty');
  }

  await env.DB.prepare(
    `INSERT INTO cleanup_alert_comments (id, fingerprint, user_id, comment_text, created_at, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, fingerprint, userId, safeText, now, now).run();

  // Update last_commented_at in acknowledgment
  await env.DB.prepare(
    `UPDATE cleanup_alert_acknowledgments SET last_commented_at = ?, updated_at = ? WHERE fingerprint = ?`
  ).bind(now, now, fingerprint).run();

  await insertAuditLog(env, {
    requestId: crypto.randomUUID(),
    actorUserId: userId,
    actorRole: 'admin',
    action: 'export_cleanup_alert_ack_update' as any,
    resourceType: 'cleanup_alert_acknowledgment',
    resourceId: fingerprint,
    outcome: 'success',
    reason: 'Added comment',
    changeSummaryJson: JSON.stringify({ newCommentId: id })
  });

  return {
    id,
    fingerprint,
    user_id: userId,
    comment_text: safeText,
    created_at: now,
    updated_at: now
  };
}

export async function updateAssignee(env: Env, fingerprint: string, adminUserId: string, assigneeUserId: string | null): Promise<void> {
  const now = new Date().toISOString();
  
  // Create ack if doesn't exist
  await env.DB.prepare(
    `INSERT INTO cleanup_alert_acknowledgments (id, alert_type, fingerprint, status, assignee_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(fingerprint) DO UPDATE SET assignee_user_id = excluded.assignee_user_id, updated_at = excluded.updated_at`
  ).bind(
    crypto.randomUUID(),
    'cleanup-failure',
    fingerprint,
    'investigating',
    assigneeUserId,
    now,
    now
  ).run();

  await insertAuditLog(env, {
    requestId: crypto.randomUUID(),
    actorUserId: adminUserId,
    actorRole: 'admin',
    action: 'export_cleanup_alert_assign' as any,
    resourceType: 'cleanup_alert_acknowledgment',
    resourceId: fingerprint,
    outcome: 'success',
    reason: assigneeUserId ? `Assigned to ${assigneeUserId}` : 'Unassigned',
    changeSummaryJson: JSON.stringify({ newAssignee: assigneeUserId })
  });
}
