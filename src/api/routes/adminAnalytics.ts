import { Hono } from 'hono';
import { Env } from '../../types/env';
import { getDeliveryAnalytics } from '../services/deliveryAnalyticsService';
import { AnalyticsRange } from '../../types/adminAnalytics';

const app = new Hono<{ Bindings: Env }>();

app.get('/delivery', async (c) => {
  const user = c.get('user') as any;
  if (!user || user.role !== 'admin') {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const range = c.req.query('range') as AnalyticsRange || '7d';
  if (!['7d', '30d', '90d'].includes(range)) {
    return c.json({ error: 'Invalid range' }, 400);
  }

  try {
    const data = await getDeliveryAnalytics(c.env, range);
    return c.json(data);
  } catch (err: any) {
    console.error('Error in delivery analytics:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default app;
