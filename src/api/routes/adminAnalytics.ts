import { Hono } from 'hono';
import { Env } from '../../types/env';
import { getDeliveryAnalytics } from '../services/deliveryAnalyticsService';
import { AnalyticsRange } from '../../types/adminAnalytics';

const app = new Hono<{ Bindings: Env }>();

app.get('/delivery', async (c) => {
  const user = c.get('user' as any) as any;
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
    // Fallback response to prevent UI crashes
    return c.json({
      summary: { totalAlerts: 0, deliverySuccessRate: 0, escalationRate: 0, p90DeliveryTimeSec: 0, criticalFailureCount: 0 },
      providerBreakdown: [],
      dailySeries: [],
      escalationFunnel: [],
      recentFailures: []
    }, 200);
  }
});

export default app;
