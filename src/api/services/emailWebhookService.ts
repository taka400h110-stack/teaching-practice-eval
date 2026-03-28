import { Env } from "../../types/env";
import { NormalizedEmailDeliveryEvent } from "../../types/emailEvents";
import { insertCleanupAuditLog as insertAuditLog } from "./exportCleanupService";

export async function processNormalizedEvents(
  env: Env,
  events: NormalizedEmailDeliveryEvent[]
): Promise<void> {
  const db = env.DB;
  
  for (const event of events) {
    // Check if event already exists
    const existing = await db.prepare(
      `SELECT id FROM email_delivery_events WHERE provider = ? AND provider_event_id = ?`
    ).bind(event.provider, event.providerEventId).first();

    if (existing) {
      continue; // Idempotent
    }

    const eventId = crypto.randomUUID();

    // Find notification
    let notificationId = event.notificationId;
    if (!notificationId && event.providerMessageId) {
      const notif = await db.prepare(
        `SELECT id FROM cleanup_alert_notifications WHERE provider_message_id = ? AND provider = ?`
      ).bind(event.providerMessageId, event.provider).first<{ id: string }>();
      if (notif) {
        notificationId = notif.id;
      }
    }

    // Insert event
    await db.prepare(
      `INSERT INTO email_delivery_events (
        id, notification_id, provider, provider_message_id, event_type, event_data_json, occurred_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      eventId,
      notificationId || null,
      event.provider,
      event.providerMessageId || null,
      event.eventType,
      event.payloadJson,
      event.occurredAt
    ).run();

    // Audit log
    await insertAuditLog(env, {
      requestId: crypto.randomUUID(),
      actorUserId: 'system-webhook',
      actorRole: 'system',
      action: 'export_cleanup_alert_email_event_received' as any,
      resourceType: 'cleanup_alert_notification',
      resourceId: notificationId || event.providerMessageId || eventId,
      outcome: 'success',
      reason: `Received ${event.eventType} event from ${event.provider}`,
      changeSummaryJson: JSON.stringify({ eventType: event.eventType })
    });

    // Update notification status if we found it
    if (notificationId) {
      // Need to determine priority.
      // Priority (higher number means it overrides lower):
      // sent: 1, delivered: 2, delivery_delayed: 3, dropped: 4, bounced: 5, complained: 6
      const priorityMap: Record<string, number> = {
        'sent': 1,
        'delivered': 2,
        'delivery_delayed': 3,
        'dropped': 4,
        'bounced': 5,
        'complained': 6,
        'opened': 0, // don't override delivery status with opened
        'clicked': 0,
        'unknown': 0
      };

      const currentNotif = await db.prepare(
        `SELECT delivery_status FROM cleanup_alert_notifications WHERE id = ?`
      ).bind(notificationId).first<{ delivery_status: string }>();

      const currentPriority = priorityMap[currentNotif?.delivery_status || ''] || 0;
      const newPriority = priorityMap[event.eventType] || 0;

      if (newPriority >= currentPriority && newPriority > 0) {
        await db.prepare(
          `UPDATE cleanup_alert_notifications SET delivery_status = ?, last_event_type = ?, last_event_at = ? WHERE id = ?`
        ).bind(event.eventType, event.eventType, event.occurredAt, notificationId).run();
      } else {
        // Just update last_event_type and last_event_at
        await db.prepare(
          `UPDATE cleanup_alert_notifications SET last_event_type = ?, last_event_at = ? WHERE id = ?`
        ).bind(event.eventType, event.occurredAt, notificationId).run();
      }
    }
  }
}
