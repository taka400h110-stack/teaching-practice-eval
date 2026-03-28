import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/cloudflare-pages";
import openaiRouter from "./api/routes/openai";
import statsRouter from "./api/routes/stats";
import dataRouter from "./api/routes/data";
import externalJobsRouter from "./api/routes/externalJobs";
import analyticsRouter from "./api/routes/analytics";
import adminMetricsRouter from "./api/routes/adminMetrics";
import { adminAlertsRouter } from "./api/routes/adminAlerts";
import adminAnalyticsRouter from "./api/routes/adminAnalytics";
import adminIncidentsRouter from "./api/routes/adminIncidents";
import adminOperationalReadinessRouter from "./api/routes/adminOperationalReadiness";


type Bindings = {
  OPENAI_API_KEY: string;
  GOOGLE_CLOUD_VISION_API_KEY: string;
  DB: D1Database;
  KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS
app.use("/api/*", cors({
  origin: ["https://localhost:3000", "https://teaching-practice-eval.pages.dev"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// ヘルスチェックとバージョン
app.get("/healthz", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));
app.get("/version", (c) => c.json({ version: "1.0.0", environment: "production" }));

// ────────────────────────────────────────────────────────────────
// API ルーティング
// ────────────────────────────────────────────────────────────────

import { requireAuth } from "./api/middleware/auth";
import { auditReadMiddleware, auditWriteMiddleware } from "./api/middleware/audit";

app.use("/api/*", requireAuth);
app.use("/api/*", auditReadMiddleware);
app.use("/api/*", auditWriteMiddleware);
app.route("/api/ai",     openaiRouter);
app.route("/api/ocr",    openaiRouter);
app.route("/api/analytics", analyticsRouter);
app.route("/api/stats",  statsRouter);
app.route("/api/data",   dataRouter);
app.route("/api/external-jobs", externalJobsRouter);
app.route("/api/admin/metrics", adminMetricsRouter);
app.route("/api/admin/alerts", adminAlertsRouter);
app.route("/api/admin/analytics", adminAnalyticsRouter);
app.route("/api/admin/incidents", adminIncidentsRouter);
app.route("/api/admin/operational-readiness", adminOperationalReadinessRouter);

// ────────────────────────────────────────────────────────────────
// ヘルスチェック
// ────────────────────────────────────────────────────────────────
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      openai: !!c.env?.OPENAI_API_KEY,
      vision: !!c.env?.GOOGLE_CLOUD_VISION_API_KEY,
      d1: !!c.env?.DB,
    },
  });
});

// ────────────────────────────────────────────────────────────────
// 静的ファイル配信
// ────────────────────────────────────────────────────────────────
app.use("/assets/*", serveStatic());
app.use("/static/*", serveStatic());

// ────────────────────────────────────────────────────────────────
// SPA フォールバック（React Router に委ねる）
// すべての非APIルートは index.html を返す
// ────────────────────────────────────────────────────────────────
// 静的ファイルの提供とSPAフォールバック
app.get('*', serveStatic());


import { runExportCleanupJob } from "./api/jobs/exportCleanup";

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: any, ctx: any) => {
    ctx.waitUntil(runExportCleanupJob(event, env, ctx));
  }
};

