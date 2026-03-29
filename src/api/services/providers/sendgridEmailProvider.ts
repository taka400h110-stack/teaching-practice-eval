
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
          'Authorization': `Bearer ${this.apiKey}`,
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
        throw new Error(`SendGrid API error: ${res.status} ${errorText}`);
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
