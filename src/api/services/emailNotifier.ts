
import { Env } from "../../types/env";
import { CleanupFailureAlertResponse } from "../../types/adminAlerts";
import { CleanupAlertNotifier } from "./notificationService";
import { createEmailProvider } from "./providers/emailProviderFactory";
import { buildCleanupAlertEmail } from "../templates/cleanupAlertEmail";

export class EmailNotifier implements CleanupAlertNotifier {
  channel = "email";

  async send(alert: CleanupFailureAlertResponse, env: Env): Promise<any> {
    if (env.EMAIL_CLEANUP_ALERT_ENABLED !== "true") {
      console.log("Email cleanup alert is disabled");
      return;
    }

    const to = env.EMAIL_CLEANUP_ALERT_TO;
    const from = env.EMAIL_CLEANUP_ALERT_FROM;
    
    if (!to || !from) {
      console.warn("EMAIL_CLEANUP_ALERT_TO or FROM not configured");
      return;
    }

    const provider = createEmailProvider(env);
    if (!provider) {
      console.warn("Email provider not correctly configured (Check EMAIL_PROVIDER and API KEY)");
      return;
    }

    // You might want to pass actual app base URL from env if available
    const appBaseUrl = "https://your-app.example.com"; 
    const { subject, text, html } = buildCleanupAlertEmail(alert, appBaseUrl);

    try {
      const result = await provider.send({
        to: [to],
        from,
        subject,
        text,
        html
      });
      return { sent: true, provider: result.provider, messageId: result.messageId };
    } catch (e) {
      console.error("Failed to send email alert", e);
      throw e;
    }
  }
}
