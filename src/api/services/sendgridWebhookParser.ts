import { NormalizedEmailDeliveryEvent, NormalizedEmailEventType } from "../../types/emailEvents";

export function parseSendgridWebhook(payload: any): NormalizedEmailDeliveryEvent[] {
  if (!Array.isArray(payload)) return [];
  
  const eventTypeMap: Record<string, NormalizedEmailEventType> = {
    'processed': 'sent',
    'delivered': 'delivered',
    'deferred': 'delivery_delayed',
    'bounce': 'bounced',
    'dropped': 'dropped',
    'open': 'opened',
    'click': 'clicked',
    'spamreport': 'complained',
  };

  return payload.map(event => {
    const rawType = event.event;
    const eventType = eventTypeMap[rawType] || 'unknown';
    
    // Extract notificationId if passed as custom arg
    const notificationId = event.notification_id || null;
    
    let occurredAt = new Date().toISOString();
    if (event.timestamp) {
      occurredAt = new Date(event.timestamp * 1000).toISOString();
    }
    
    // sendgrid attaches a sg_message_id, often formatted with extra parts, but we can just store the string
    const providerMessageId = event.sg_message_id ? event.sg_message_id.split('.')[0] : null;

    return {
      provider: 'sendgrid',
      providerEventId: event.sg_event_id || null,
      providerMessageId,
      notificationId,
      eventType,
      occurredAt,
      recipient: event.email || null,
      reason: event.reason || null,
      payloadJson: JSON.stringify(event)
    };
  });
}
