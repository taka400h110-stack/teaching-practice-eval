export interface TriggerIncidentInput {
  fingerprint: string;
  severity: "warning" | "critical";
  topReason: string;
  errorCount: number;
  lastErrorAt: string;
  latestRunOutcome: string;
  dashboardUrl: string;
  ackStatus?: string | null;
  escalationLevel?: string | null;
}

export interface ResolveIncidentInput {
  fingerprint: string;
  reason: string;
}

export interface IncidentProviderResult {
  success: boolean;
  providerIncidentId?: string;
  providerDedupKey?: string;
  responseCode?: number;
  error?: string;
  payloadJson?: string;
}

export interface IncidentProvider {
  trigger(input: TriggerIncidentInput): Promise<IncidentProviderResult>;
  resolve(input: ResolveIncidentInput): Promise<IncidentProviderResult>;
}
