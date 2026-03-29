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
    return c.json({ error: "Failed to get cleanup metrics" }, 500);
  }
});

export default adminMetricsRouter;
