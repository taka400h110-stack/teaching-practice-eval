export type CleanupRange = "7d" | "30d";

export type CleanupDailyPoint = {
  date: string;
  executions: number;
  deletedTotal: number;
  deletedTokens: number;
  deletedObjects: number;
  deletedOrphans: number;
  errors: number;
};

export type CleanupMetricsSummary = {
  executions: number;
  deletedTotal: number;
  deletedTokens: number;
  deletedObjects: number;
  deletedOrphans: number;
  errors: number;
  lastRunAt: string | null;
  lastRunOutcome: "success" | "partial" | "failed" | "unknown";
};

export type CleanupRunRow = {
  id: string;
  createdAt: string;
  cron: string | null;
  outcome: string;
  deletedTokens: number;
  deletedObjects: number;
  deletedOrphans: number;
  errors: number;
  dryRun: boolean;
};

export type CleanupErrorRow = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  reason: string | null;
  endpoint: string | null;
};

export type CleanupMetricsResponse = {
  range: CleanupRange;
  generatedAt: string;
  summary: CleanupMetricsSummary;
  dailySeries: CleanupDailyPoint[];
  recentRuns: CleanupRunRow[];
  recentErrors: CleanupErrorRow[];
};
