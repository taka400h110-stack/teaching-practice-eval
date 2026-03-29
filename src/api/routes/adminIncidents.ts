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
  const incidents = await getIncidentsForAlert(c.env, fingerprint);
  return c.json({ incidents });
});

// POST /api/admin/incidents/cleanup/trigger
adminIncidentsRouter.post('/cleanup/trigger', async (c) => {
  const body = await c.req.json();
  if (!body.fingerprint || !body.severity) {
    return c.json({ error: 'Missing required fields' }, 400);
  }
  const success = await triggerIncident(c.env, body);
  return c.json({ success });
});

// POST /api/admin/incidents/cleanup/resolve
adminIncidentsRouter.post('/cleanup/resolve', async (c) => {
  const body = await c.req.json();
  if (!body.fingerprint) {
    return c.json({ error: 'Missing fingerprint' }, 400);
  }
  const success = await resolveIncident(c.env, body);
  return c.json({ success });
});

export default adminIncidentsRouter;
