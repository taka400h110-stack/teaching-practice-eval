import { CleanupFailureAlertResponse } from "../../types/adminAlerts";
import { Env } from "../../types/env";
import { CleanupAlertNotifier } from "./notificationService";

export class SlackNotifier implements CleanupAlertNotifier {
  channel = "slack";
  
  async send(alert: CleanupFailureAlertResponse, env: Env): Promise<void> {
    const webhookUrl = env.SLACK_CLEANUP_ALERT_WEBHOOK_URL;
    const enabled = env.SLACK_CLEANUP_ALERT_ENABLED === 'true';

    if (!enabled || !webhookUrl) return;

    const payload = {
      text: "Cleanup failures detected in the last 24 hours",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Cleanup failures detected in the last 24 hours*"
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Errors*\n${alert.errorCount}` },
            { type: "mrkdwn", text: `*Last Error*\n${alert.lastErrorAt || 'N/A'}` },
            { type: "mrkdwn", text: `*Latest Run Outcome*\n${alert.latestRunOutcome}` },
            { type: "mrkdwn", text: `*Top Reason*\n${alert.topReasons[0]?.reason || 'unknown'}` }
          ]
        }
      ]
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Slack API error: ${res.status} ${res.statusText}`);
    }
  }
}
