import { Env } from "../../types/env";
import { IncidentProvider, TriggerIncidentInput, ResolveIncidentInput, IncidentProviderResult } from "../../types/incidents";

export class PagerDutyIncidentProvider implements IncidentProvider {
  constructor(private env: Env) {}

  async trigger(input: TriggerIncidentInput): Promise<IncidentProviderResult> {
    const routingKey = this.env.PAGERDUTY_ROUTING_KEY;
    if (!routingKey) return { success: false, error: "PAGERDUTY_ROUTING_KEY not set" };

    const dedupKey = `cleanup:${input.fingerprint}`;
    const severityMap: any = {
      critical: this.env.PAGERDUTY_SEVERITY_CRITICAL || "critical",
      warning: this.env.PAGERDUTY_SEVERITY_WARNING || "warning",
    };

    const payload = {
      routing_key: routingKey,
      event_action: "trigger",
      dedup_key: dedupKey,
      payload: {
        summary: `Cleanup Alert: ${input.topReason}`,
        source: "cleanup_alert_system",
        severity: severityMap[input.severity] || "warning",
        timestamp: new Date().toISOString(),
        custom_details: {
          fingerprint: input.fingerprint,
          errorCount: input.errorCount,
          lastErrorAt: input.lastErrorAt,
          latestRunOutcome: input.latestRunOutcome,
          dashboardUrl: input.dashboardUrl,
          ackStatus: input.ackStatus,
          escalationLevel: input.escalationLevel
        }
      }
    };

    try {
      const res = await fetch("https://events.pagerduty.com/v2/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resData = await res.json() as any;
      
      return {
        success: res.ok,
        providerDedupKey: dedupKey,
        providerIncidentId: resData.dedup_key || dedupKey,
        responseCode: res.status,
        payloadJson: JSON.stringify(payload)
      };
    } catch (err: any) {
      return { success: false, error: err.message, payloadJson: JSON.stringify(payload) };
    }
  }

  async resolve(input: ResolveIncidentInput): Promise<IncidentProviderResult> {
    const routingKey = this.env.PAGERDUTY_ROUTING_KEY;
    if (!routingKey) return { success: false, error: "PAGERDUTY_ROUTING_KEY not set" };

    const dedupKey = `cleanup:${input.fingerprint}`;

    const payload = {
      routing_key: routingKey,
      event_action: "resolve",
      dedup_key: dedupKey
    };

    try {
      const res = await fetch("https://events.pagerduty.com/v2/enqueue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return {
        success: res.ok,
        providerDedupKey: dedupKey,
        responseCode: res.status,
        payloadJson: JSON.stringify(payload)
      };
    } catch (err: any) {
      return { success: false, error: err.message, payloadJson: JSON.stringify(payload) };
    }
  }
}
