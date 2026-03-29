import { Hono } from 'hono';
import { Env } from '../../types/env';
import { parseResendWebhook } from '../services/resendWebhookParser';
import { parseSendgridWebhook } from '../services/sendgridWebhookParser';
import { verifySendgridSignature } from '../services/sendgridWebhookVerifier';
import { processNormalizedEvents } from '../services/emailWebhookService';
import { insertCleanupAuditLog as insertAuditLog } from '../services/exportCleanupService';

const app = new Hono<{ Bindings: Env }>();

app.post('/resend', async (c) => {
  const env = c.env;
  if (env.EMAIL_DELIVERY_TRACKING_ENABLED === 'false') {
    return c.json({ ok: true }); // Ignore if disabled
  }
  
  // Resend webhook signature verification (Svix standard, but often just checking headers or secret)
  // Let's do a simple secret check if RESEND_WEBHOOK_SECRET is set
  if (env.RESEND_WEBHOOK_SECRET) {
    const authHeader = c.req.header('Authorization') || c.req.header('Webhook-Signature') || '';
    if (!authHeader.includes(env.RESEND_WEBHOOK_SECRET)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
  }

  try {
    const payload = await c.req.json();
    const events = parseResendWebhook(payload);
    if (events.length > 0) {
      await processNormalizedEvents(env, events);
    }
    return c.json({ ok: true });
  } catch (err: any) {
    console.error('Error processing Resend webhook:', err);
    return c.json({ error: 'Bad Request' }, 400);
  }
});

app.post('/sendgrid', async (c) => {
  const env = c.env;
  if (env.EMAIL_DELIVERY_TRACKING_ENABLED === 'false') {
    return c.json({ ok: true });
  }

  try {
    const payloadText = await c.req.text();
    const signature = c.req.header('X-Twilio-Email-Event-Webhook-Signature') || '';
    const timestamp = c.req.header('X-Twilio-Email-Event-Webhook-Timestamp') || '';

    if (env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY) {
      const isValid = await verifySendgridSignature(
        env.SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY,
        payloadText,
        signature,
        timestamp
      );
      if (!isValid) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
    }

    const payload = JSON.parse(payloadText);
    const events = parseSendgridWebhook(payload);
    
    if (events.length > 0) {
      await processNormalizedEvents(env, events);
    }
    return c.json({ ok: true });
  } catch (err: any) {
    console.error('Error processing SendGrid webhook:', err);
    return c.json({ error: 'Bad Request' }, 400);
  }
});

export default app;
