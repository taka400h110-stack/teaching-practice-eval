export type AnalyticsRange = "7d" | "30d" | "90d";

export interface DeliveryAnalyticsResponse {
  range: AnalyticsRange;
  generatedAt: string;
  summary: {
    totalNotifications: number;
    deliveredCount: number;
    failedCount: number;
    bouncedCount: number;
    droppedCount: number;
    deliveryDelayedCount: number;
    successRate: number;
    bounceRate: number;
    providerFailureRate: {
      resend: number;
      sendgrid: number;
    };
    escalationReachRate: {
      l1: number;
      l2: number;
      l3: number;
    };
  };
  providerBreakdown: Array<{
    provider: "resend" | "sendgrid";
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    dropped: number;
    complained: number;
    successRate: number;
    failureRate: number;
  }>;
  dailySeries: Array<{
    date: string;
    sent: number;
    delivered: number;
    bounced: number;
    dropped: number;
    failed: number;
  }>;
  escalationFunnel: {
    totalAlerts: number;
    reachedL1: number;
    reachedL2: number;
    reachedL3: number;
    l1Rate: number;
    l2Rate: number;
    l3Rate: number;
  };
  recentFailures: Array<{
    id: string;
    provider: string | null;
    providerMessageId: string | null;
    deliveryStatus: string | null;
    lastEventType: string | null;
    lastEventAt: string | null;
    fingerprint: string | null;
    reason: string | null;
  }>;
}
