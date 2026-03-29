export interface OperationalReadinessResponse {
  generatedAt: string;
  environment: string;
  secrets: {
    required: string[];
    missing: string[];
    optionalMissing: string[];
  };
  cron: {
    hasScheduledHandler: boolean;
    configuredCrons: string[];
    warnings: string[];
  };
  providers: Array<{
    name: string;
    enabled: boolean;
    status: "healthy" | "degraded" | "failing" | "disabled";
    latestSuccessAt: string | null;
    latestFailureAt: string | null;
    failureCount24h: number;
    failureRate24h: number;
    lastError: string | null;
    verificationFailureCount24h?: number;
  }>;
  readiness: {
    ok: boolean;
    blockingIssues: string[];
    warnings: string[];
  };
}
