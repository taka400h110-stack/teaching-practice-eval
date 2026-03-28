const fs = require('fs');
const path = require('path');

// 1. Types
const typesPath = path.join(__dirname, '../src/api/services/providers/emailProvider.ts');
fs.mkdirSync(path.dirname(typesPath), { recursive: true });

fs.writeFileSync(typesPath, `
export interface EmailProvider {
  send(input: {
    to: string[];
    from: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<{
    provider: string;
    messageId?: string | null;
  }>;
}
`);

// 2. Resend
const resendPath = path.join(__dirname, '../src/api/services/providers/resendEmailProvider.ts');
fs.writeFileSync(resendPath, `
import { EmailProvider } from './emailProvider';

export class ResendEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private timeoutMs: number = 10000) {}

  async send(input: { to: string[]; from: string; subject: string; text: string; html?: string; }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.apiKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: input.from,
          to: input.to,
          subject: input.subject,
          text: input.text,
          html: input.html
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(\`Resend API error: \${res.status} \${errorText}\`);
      }

      const data = await res.json() as { id: string };
      return {
        provider: 'resend',
        messageId: data.id
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
`);

// 3. SendGrid
const sendgridPath = path.join(__dirname, '../src/api/services/providers/sendgridEmailProvider.ts');
fs.writeFileSync(sendgridPath, `
import { EmailProvider } from './emailProvider';

export class SendGridEmailProvider implements EmailProvider {
  constructor(private apiKey: string, private timeoutMs: number = 10000) {}

  async send(input: { to: string[]; from: string; subject: string; text: string; html?: string; }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const content = [{ type: 'text/plain', value: input.text }];
      if (input.html) {
        content.push({ type: 'text/html', value: input.html });
      }

      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${this.apiKey}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: input.to.map(email => ({ email })) }],
          from: { email: input.from },
          subject: input.subject,
          content
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(\`SendGrid API error: \${res.status} \${errorText}\`);
      }

      // SendGrid typical success response is 202 without body
      const messageId = res.headers.get('X-Message-Id') || null;

      return {
        provider: 'sendgrid',
        messageId
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
`);

// 4. Factory
const factoryPath = path.join(__dirname, '../src/api/services/providers/emailProviderFactory.ts');
fs.writeFileSync(factoryPath, `
import { Env } from '../../../types/env';
import { EmailProvider } from './emailProvider';
import { ResendEmailProvider } from './resendEmailProvider';
import { SendGridEmailProvider } from './sendgridEmailProvider';

export function createEmailProvider(env: Env): EmailProvider | null {
  const providerName = env.EMAIL_PROVIDER || 'resend';
  
  if (providerName === 'resend' && env.RESEND_API_KEY) {
    return new ResendEmailProvider(env.RESEND_API_KEY);
  } else if (providerName === 'sendgrid' && env.SENDGRID_API_KEY) {
    return new SendGridEmailProvider(env.SENDGRID_API_KEY);
  }
  
  return null; // Not properly configured
}
`);

// 5. Template
const templatePath = path.join(__dirname, '../src/api/templates/cleanupAlertEmail.ts');
fs.mkdirSync(path.dirname(templatePath), { recursive: true });
fs.writeFileSync(templatePath, `
import { CleanupFailureAlertResponse } from '../../types/adminAlerts';

export function buildCleanupAlertEmail(alert: CleanupFailureAlertResponse, appBaseUrl: string) {
  const detailUrl = \`\${appBaseUrl}/admin/system?tab=alerts\`;
  const subject = \`[Admin Alert] Cleanup failures detected (\${alert.errorCount} errors)\`;
  
  const formattedDate = alert.lastErrorAt ? new Date(alert.lastErrorAt).toLocaleString() : 'N/A';
  const topReason = alert.topReasons?.[0]?.reason ?? 'unknown';

  const text = \`
直近\${alert.rangeHours}時間で cleanup 処理に \${alert.errorCount} 件のエラーが記録されました。
最終エラー時刻: \${formattedDate}
最新 run outcome: \${alert.latestRunOutcome}
主な原因: \${topReason}

詳細: \${detailUrl}
  \`.trim();

  const html = \`
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: \${alert.severity === 'critical' ? '#d32f2f' : '#ed6c02'}; color: white; padding: 16px;">
        <h2 style="margin: 0;">Cleanup Failure Alert (\${alert.severity.toUpperCase()})</h2>
      </div>
      <div style="padding: 16px;">
        <p>直近<strong>\${alert.rangeHours}時間</strong>で cleanup 処理に <strong>\${alert.errorCount}</strong> 件のエラーが記録されました。</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; width: 30%;">最新の実行結果</td>
            <td style="padding: 8px; border: 1px solid #ddd;">\${alert.latestRunOutcome}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">最終エラー時刻</td>
            <td style="padding: 8px; border: 1px solid #ddd;">\${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">主な原因</td>
            <td style="padding: 8px; border: 1px solid #ddd;">\${topReason}</td>
          </tr>
        </table>
        <div style="text-align: center; margin-top: 24px;">
          <a href="\${detailUrl}" style="background-color: #1976d2; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; display: inline-block;">
            詳細を確認する
          </a>
        </div>
      </div>
    </div>
  \`;

  return { subject, text, html };
}
`);

// 6. EmailNotifier update
const notifierPath = path.join(__dirname, '../src/api/services/emailNotifier.ts');
fs.writeFileSync(notifierPath, `
import { Env } from "../../types/env";
import { CleanupFailureAlertResponse } from "../../types/adminAlerts";
import { CleanupAlertNotifier } from "./notificationService";
import { createEmailProvider } from "./providers/emailProviderFactory";
import { buildCleanupAlertEmail } from "../templates/cleanupAlertEmail";

export class EmailNotifier implements CleanupAlertNotifier {
  channel = "email";

  async send(env: Env, alert: CleanupFailureAlertResponse): Promise<any> {
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
`);

console.log("Updated email infrastructure");
