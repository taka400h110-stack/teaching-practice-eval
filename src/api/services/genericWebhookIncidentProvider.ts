import { Env } from "../../types/env";
import { IncidentProvider, TriggerIncidentInput, ResolveIncidentInput, IncidentProviderResult } from "../../types/incidents";

export class GenericWebhookIncidentProvider implements IncidentProvider {
  constructor(private env: Env) {}

  async trigger(input: TriggerIncidentInput): Promise<IncidentProviderResult> {
    const url = this.env.GENERIC_WEBHOOK_URL;
    if (!url) return { success: false, error: "GENERIC_WEBHOOK_URL not set" };

    const payload = {
      eventType: "cleanup_alert_triggered",
      fingerprint: input.fingerprint,
      severity: input.severity,
      topReason: input.topReason,
      errorCount: input.errorCount,
      dashboardUrl: input.dashboardUrl,
      ackStatus: input.ackStatus,
      escalationLevel: input.escalationLevel
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.env.GENERIC_WEBHOOK_AUTH_HEADER && this.env.GENERIC_WEBHOOK_AUTH_VALUE) {
      headers[this.env.GENERIC_WEBHOOK_AUTH_HEADER] = this.env.GENERIC_WEBHOOK_AUTH_VALUE;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      
      return {
        success: res.ok,
        providerDedupKey: `cleanup:${input.fingerprint}`,
        responseCode: res.status,
        payloadJson: JSON.stringify(payload)
      };
    } catch (err: any) {
      return { success: false, error: err.message, payloadJson: JSON.stringify(payload) };
    }
  }

  async resolve(input: ResolveIncidentInput): Promise<IncidentProviderResult> {
    const url = this.env.GENERIC_WEBHOOK_URL;
    if (!url) return { success: false, error: "GENERIC_WEBHOOK_URL not set" };

    const payload = {
      eventType: "cleanup_alert_resolved",
      fingerprint: input.fingerprint,
      reason: input.reason
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.env.GENERIC_WEBHOOK_AUTH_HEADER && this.env.GENERIC_WEBHOOK_AUTH_VALUE) {
      headers[this.env.GENERIC_WEBHOOK_AUTH_HEADER] = this.env.GENERIC_WEBHOOK_AUTH_VALUE;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      return {
        success: res.ok,
        providerDedupKey: `cleanup:${input.fingerprint}`,
        responseCode: res.status,
        payloadJson: JSON.stringify(payload)
      };
    } catch (err: any) {
      return { success: false, error: err.message, payloadJson: JSON.stringify(payload) };
    }
  }
}
