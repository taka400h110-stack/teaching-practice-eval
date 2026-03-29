import { Env } from "../../types/env";
import { IncidentProvider, TriggerIncidentInput, ResolveIncidentInput, IncidentProviderResult } from "../../types/incidents";

export class OpsgenieIncidentProvider implements IncidentProvider {
  constructor(private env: Env) {}

  async trigger(input: TriggerIncidentInput): Promise<IncidentProviderResult> {
    const apiKey = this.env.OPSGENIE_API_KEY;
    if (!apiKey) return { success: false, error: "OPSGENIE_API_KEY not set" };
    
    const baseUrl = this.env.OPSGENIE_API_URL || "https://api.opsgenie.com";
    const alias = `cleanup:${input.fingerprint}`;
    
    const priorityMap: any = {
      critical: this.env.OPSGENIE_PRIORITY_CRITICAL || "P1",
      warning: this.env.OPSGENIE_PRIORITY_WARNING || "P3",
    };

    const payload = {
      message: `Cleanup Alert: ${input.topReason}`,
      alias,
      description: `Errors: ${input.errorCount}, Last Error: ${input.lastErrorAt}\n${input.dashboardUrl}`,
      priority: priorityMap[input.severity],
      details: {
        fingerprint: input.fingerprint,
        latestRunOutcome: input.latestRunOutcome,
        ackStatus: input.ackStatus || "",
        escalationLevel: input.escalationLevel || ""
      }
    };

    try {
      const res = await fetch(`${baseUrl}/v2/alerts`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `GenieKey ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      
      const resData = await res.json() as any;
      return {
        success: res.ok,
        providerDedupKey: alias,
        providerIncidentId: resData.requestId || alias,
        responseCode: res.status,
        payloadJson: JSON.stringify(payload)
      };
    } catch (err: any) {
      return { success: false, error: err.message, payloadJson: JSON.stringify(payload) };
    }
  }

  async resolve(input: ResolveIncidentInput): Promise<IncidentProviderResult> {
    const apiKey = this.env.OPSGENIE_API_KEY;
    if (!apiKey) return { success: false, error: "OPSGENIE_API_KEY not set" };

    const baseUrl = this.env.OPSGENIE_API_URL || "https://api.opsgenie.com";
    const alias = `cleanup:${input.fingerprint}`;

    const payload = {
      note: input.reason
    };

    try {
      const res = await fetch(`${baseUrl}/v2/alerts/${encodeURIComponent(alias)}/close?identifierType=alias`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `GenieKey ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      return {
        success: res.ok,
        providerDedupKey: alias,
        responseCode: res.status,
        payloadJson: JSON.stringify(payload)
      };
    } catch (err: any) {
      return { success: false, error: err.message, payloadJson: JSON.stringify(payload) };
    }
  }
}
