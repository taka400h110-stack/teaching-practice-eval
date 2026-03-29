import { NormalizedEmailDeliveryEvent, NormalizedEmailEventType } from "../../types/emailEvents";

export function parseResendWebhook(payload: any): NormalizedEmailDeliveryEvent[] {
  if (!payload || !payload.type) return [];
  
  const eventTypeMap: Record<string, NormalizedEmailEventType> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'delivery_delayed',
    'email.bounced': 'bounced',
    'email.complained': 'complained',
    'email.opened': 'opened',
    'email.clicked': 'clicked',
  };

  const rawType = payload.type;
  const eventType = eventTypeMap[rawType] || 'unknown';
  
  const data = payload.data || {};
  const emailId = data.email_id;
  
  // Extract notificationId if passed in tags/metadata (Resend uses tags)
  let notificationId = null;
  if (data.tags) {
    const notifTag = data.tags.find((t: any) => t.name === 'notification_id');
    if (notifTag) notificationId = notifTag.value;
  }

  const occurredAt = payload.created_at || new Date().toISOString();
  
  return [{
    provider: 'resend',
    providerEventId: payload.created_at + "_" + emailId, // Resend events often don't have unique event IDs, use created_at + emailId
    providerMessageId: emailId,
    notificationId,
    eventType,
    occurredAt,
    recipient: data.to ? data.to[0] : null,
    reason: rawType === 'email.bounced' && data.bounce ? data.bounce.error_description : null,
    payloadJson: JSON.stringify(payload)
  }];
}
