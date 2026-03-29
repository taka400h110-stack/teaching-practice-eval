
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
          'Authorization': `Bearer ${this.apiKey}`,
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
        throw new Error(`Resend API error: ${res.status} ${errorText}`);
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
