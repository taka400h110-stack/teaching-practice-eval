import { Hono } from 'hono';
import { Env } from '../../types/env';
import { getIncidentsForAlert, triggerIncident, resolveIncident } from '../services/cleanupIncidentService';

const adminIncidentsRouter = new Hono<{ Bindings: Env }>();

// GET /api/admin/incidents/cleanup?fingerprint=...
adminIncidentsRouter.get('/cleanup', async (c) => {
  const fingerprint = c.req.query('fingerprint');
  if (!fingerprint) {
    return c.json({ error: 'Fingerprint is required' }, 400);
  }
  try {
    const incidents = await getIncidentsForAlert(c.env, fingerprint);
    return c.json({ incidents });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return c.json({ incidents: [] }, 200);
  }
});

// POST /api/admin/incidents/cleanup/trigger
adminIncidentsRouter.post('/cleanup/trigger', async (c) => {
  const body = await c.req.json();
  if (!body.fingerprint || !body.severity) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  try {
    const success = await triggerIncident(c.env, body);
    return c.json({ success });
  } catch (error) {
    console.error('Error triggering incident:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/admin/incidents/cleanup/resolve
adminIncidentsRouter.post('/cleanup/resolve', async (c) => {
  const body = await c.req.json();
  if (!body.fingerprint) {
    return c.json({ error: 'Missing fingerprint' }, 400);
  }
  try {
    const success = await resolveIncident(c.env, body);
    return c.json({ success });
  } catch (error) {
    console.error('Error resolving incident:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

export default adminIncidentsRouter;
