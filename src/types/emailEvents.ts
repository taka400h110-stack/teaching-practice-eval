export type EmailDeliveryProvider = "resend" | "sendgrid";

export type NormalizedEmailEventType =
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "dropped"
  | "opened"
  | "clicked"
  | "complained"
  | "unknown";

export interface NormalizedEmailDeliveryEvent {
  provider: EmailDeliveryProvider;
  providerEventId?: string | null;
  providerMessageId?: string | null;
  notificationId?: string | null;
  eventType: NormalizedEmailEventType;
  occurredAt: string;
  recipient?: string | null;
  reason?: string | null;
  payloadJson: string;
}
