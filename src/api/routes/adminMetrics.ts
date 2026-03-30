import { Hono } from "hono";
import { requireAuth, requireRoles } from "../middleware/auth";
import { getCleanupMetrics } from "../services/cleanupMetricsService";

type Env = {
  Bindings: {
    DB: D1Database;
  };
};

const adminMetricsRouter = new Hono<Env>();

// 必須ミドルウェア
adminMetricsRouter.use("*", requireAuth);
adminMetricsRouter.use("*", requireRoles(["admin"] as any));

adminMetricsRouter.get("/cleanup", async (c) => {
  const range = c.req.query("range") as "7d" | "30d" | undefined;
  
  if (range !== "7d" && range !== "30d") {
    return c.json({ error: "Invalid range. Must be 7d or 30d" }, 400);
  }

  try {
    const metrics = await getCleanupMetrics(c.env.DB, range);
    return c.json(metrics);
  } catch (error) {
    console.error("Failed to get cleanup metrics", error);
    // Fallback response to prevent UI crashes
    return c.json({
      range: range || "7d",
      generatedAt: new Date().toISOString(),
      summary: {
        executions: 0,
        deletedTotal: 0,
        deletedTokens: 0,
        deletedObjects: 0,
        deletedOrphans: 0,
        errors: 0,
        lastRunAt: null,
        lastRunOutcome: "unknown"
      },
      dailySeries: [],
      recentRuns: [],
      recentErrors: []
    }, 200);
  }
});

export default adminMetricsRouter;
