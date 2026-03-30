export type CleanupFailureAlertResponse = {
  hasAlert: boolean;
  severity: "warning" | "critical" | "none";
  rangeHours: number; // 24
  errorCount: number;
  lastErrorAt: string | null;
  latestRunOutcome: "success" | "partial" | "failed" | "unknown";
  topReasons: Array<{
    reason: string;
    count: number;
  }>;
  recentErrors: Array<{
    id: string;
    createdAt: string;
    action: string;
    resourceType: string | null;
    resourceId: string | null;
    reason: string | null;
    endpoint: string | null;
  }>;
  fingerprint: string | null;
  dismissed: boolean;
  dismissedAt?: string | null;
  detailUrl: string;
  ackDeadlineAt?: string | null;
  ackBreached?: boolean;
  resolveDeadlineAt?: string | null;
  resolveBreached?: boolean;
  renotifyCount?: number;
  lastRenotifiedAt?: string | null; // "/admin/system?tab=cleanup"
};

export type AlertHistoryRow = {
  id: string;
  createdAt: string;
  fingerprint: string | null;
  severity: "warning" | "critical" | "unknown";
  eventType: "notify_sent" | "notify_suppressed" | "dismissed" | "alert_generated" | "acknowledged";
  channel: "slack" | "email" | "ui" | null;
  outcome: "success" | "failed" | "suppressed" | "unknown";
  errorCount: number | null;
  lastErrorAt: string | null;
  topReason: string | null;
  reason: string | null;
  actorUserId: string | null;
  changeSummaryJson?: string | null;
};

export type AlertAcknowledgment = {
  exists: boolean;
  status: "acknowledged" | "investigating" | "resolved" | null;
  acknowledgedByUserId: string | null;
  acknowledgedAt: string | null;
  note: string | null;
  assigneeUserId: string | null;
  resolvedAt: string | null;
  lastCommentedAt: string | null;
  commentCount?: number;
};

export type CleanupFailureAlertResponseWithAck = CleanupFailureAlertResponse & {
  acknowledgment: AlertAcknowledgment | null;
};

export type AlertHistoryQuery = {
  range?: "7d" | "30d" | "90d" | "custom";
  dateFrom?: string;
  dateTo?: string;
  eventTypes?: string;
  severities?: string;
  channels?: string;
  outcomes?: string;
  reasonQuery?: string;
  fingerprintPrefix?: string;
  actorUserId?: string;
  sort?: "createdAt:desc" | "createdAt:asc";
  limit?: number;
  cursor?: string;
};

export type AlertHistoryResponse = {
  items: AlertHistoryRow[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
  filtersApplied: any;
  summary: {
    totalMatched: number;
    notifySent: number;
    notifySuppressed: number;
    dismissed: number;
    alertGenerated: number;
    failedCount: number;
  };
};

export type CleanupAlertEscalation = {
  id: string;
  fingerprint: string;
  level: number;
  status: "active" | "resolved" | "cancelled";
  triggered_at: string;
  resolved_at: string | null;
  note: string | null;
};
