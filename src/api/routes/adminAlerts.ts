import { getComments, addComment, updateAssignee } from '../services/cleanupAlertCommentsService';
import { Hono } from "hono";
import { requireAuth, requireRoles } from "../middleware/auth";
import { getCleanupFailureAlert, dismissCleanupAlert, upsertCleanupAlertAcknowledgment } from "../services/cleanupAlertService";
import { getCleanupAlertHistory } from "../services/cleanupAlertHistoryService";
import { Env } from "../../types/env";

export const adminAlertsRouter = new Hono<{ Bindings: Env; Variables: any }>();

adminAlertsRouter.use("*", requireAuth);
adminAlertsRouter.use("*", requireRoles(["admin", "researcher"]));

adminAlertsRouter.get("/cleanup-failure", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  try {
    const userId = user.id || user.sub;
    const alert = await getCleanupFailureAlert(db, userId);
    return c.json(alert);
  } catch (error) {
    console.error("Error getting cleanup failure alert:", error);
    // Fallback response to prevent UI crashes
    return c.json({
      hasAlert: false,
      severity: "none",
      rangeHours: 24,
      errorCount: 0,
      lastErrorAt: null,
      latestRunOutcome: "unknown",
      topReasons: [],
      recentErrors: [],
      fingerprint: null,
      dismissed: false,
      detailUrl: "/admin"
    }, 200);
  }
});

adminAlertsRouter.post("/cleanup-failure/dismiss", async (c) => {
  const user = c.get("user");
  const userId = user?.id || user?.sub;
  
  if (!userId) {
    return c.json({ error: "Missing user id" }, 401);
  }
  
  const { fingerprint } = await c.req.json().catch(() => ({ fingerprint: null }));
  if (!fingerprint) {
    return c.json({ error: "fingerprint required" }, 400);
  }
  try {
    const result = await dismissCleanupAlert(c.env, userId, fingerprint);
    return c.json(result);
  } catch (error) {
    console.error("Error dismissing alert:", error);
    return c.json({ error: "Failed to dismiss alert" }, 500);
  }
});

adminAlertsRouter.post("/cleanup-failure/acknowledge", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { fingerprint, status, note } = await c.req.json().catch(() => ({ fingerprint: null, status: null, note: undefined }));
  if (!fingerprint || !status) {
    return c.json({ error: "fingerprint and status required" }, 400);
  }
  if (!['acknowledged', 'investigating', 'resolved'].includes(status)) {
    return c.json({ error: "invalid status" }, 400);
  }

  try {
    const acknowledgment = await upsertCleanupAlertAcknowledgment(c.env, userId, fingerprint, status, note);
    return c.json({ ok: true, fingerprint, acknowledgment });
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    return c.json({ error: "Failed to acknowledge alert" }, 500);
  }
});

adminAlertsRouter.get("/history", async (c) => {
  const db = c.env.DB;
  const query = {
    range: (c.req.query("range") || "30d") as any,
    dateFrom: c.req.query("dateFrom"),
    dateTo: c.req.query("dateTo"),
    eventTypes: c.req.query("eventTypes"),
    severities: c.req.query("severities"),
    channels: c.req.query("channels"),
    outcomes: c.req.query("outcomes"),
    reasonQuery: c.req.query("reasonQuery"),
    fingerprintPrefix: c.req.query("fingerprintPrefix"),
    actorUserId: c.req.query("actorUserId"),
    sort: (c.req.query("sort") || "createdAt:desc") as any,
    limit: parseInt(c.req.query("limit") || "50", 10),
    cursor: c.req.query("cursor")
  };

  try {
    const data = await getCleanupAlertHistory(c.env.DB, query);
    return c.json(data);
  } catch (error) {
    console.error("Error getting alert history:", error);
    return c.json({ 
      items: [],
      pageInfo: { nextCursor: null, hasNextPage: false },
      summary: { totalMatched: 0, notifySent: 0, notifySuppressed: 0, dismissed: 0, alertGenerated: 0, failedCount: 0 },
      filtersApplied: query
    }, 200);
  }
});
