import { Hono } from 'hono';
import { Env } from '../../types/env';
import { getOperationalReadiness } from '../services/operationalReadinessService';

const adminOperationalReadinessRouter = new Hono<{ Bindings: Env }>();

adminOperationalReadinessRouter.get('/', async (c) => {
  try {
    const readiness = await getOperationalReadiness(c.env);
    return c.json(readiness);
  } catch (err) {
    console.error('Error fetching operational readiness:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});

export default adminOperationalReadinessRouter;
