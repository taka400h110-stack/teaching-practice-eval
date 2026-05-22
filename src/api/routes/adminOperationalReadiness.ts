import { Hono } from 'hono';
import { Env } from '../../types/env';
import { getOperationalReadiness } from '../services/operationalReadinessService';

const adminOperationalReadinessRouter = new Hono<{ Bindings: Env }>();

adminOperationalReadinessRouter.get('/', async (c) => {
  // ロールチェック: admin / researcher / collaborator / board_observer のみ閲覧可
  const user = c.get('user' as any) as { role?: string; roles?: string[] } | undefined;
  const allowedRoles = ['admin', 'researcher', 'collaborator', 'board_observer'];
  const userRoles = user?.roles && user.roles.length > 0
    ? user.roles
    : (user?.role ? [user.role] : []);
  const hasAccess = userRoles.some((r) => allowedRoles.includes(r));
  if (!user || !hasAccess) {
    return c.json({ error: 'アクセス権限がありません' }, 403);
  }

  try {
    const readiness = await getOperationalReadiness(c.env);
    return c.json(readiness);
  } catch (err) {
    console.error('Error fetching operational readiness:', err);
    // Fallback response to prevent UI crashes
    return c.json({
      overallStatus: 'unknown',
      checks: []
    }, 200);
  }
});

export default adminOperationalReadinessRouter;
