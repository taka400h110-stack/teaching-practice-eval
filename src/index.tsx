/**
 * src/index.tsx
 * Hono メインエントリポイント
 * Cloudflare Pages Functions（_worker.js）
 * 
 * APIルート:
 *   /api/ai/*        → OpenAI CoT-A/B/C
 *   /api/ocr/*       → OCR（Google Cloud Vision / Tesseract fallback）
 *   /api/stats/*     → 統計計算（ICC, Bland-Altman, Pearson）
 *   /api/export/*    → CSV/Excel エクスポート
 *   /api/data/*      → D1データベース CRUD
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/cloudflare-pages";
import openaiRouter from "./api/routes/openai";
import statsRouter from "./api/routes/stats";
import dataRouter from "./api/routes/data";
import externalJobsRouter from "./api/routes/externalJobs";
import analyticsRouter from "./api/routes/analytics";

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

import { Context, Next } from "hono";

import { verify } from 'hono/jwt';

// 本格的なJWT認証ミドルウェア
export const authMiddleware = async (c: Context, next: Next) => {
  // /auth と healthcheck はスキップ
  if (c.req.path.startsWith('/api/data/auth') || c.req.path === '/api/health') {
    await next();
    return;
  }
  
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized: Missing or invalid Authorization header" }, 401);
  }
  
  try {
    const token = authHeader.split(" ")[1];
    const secret = (c.env as any)?.JWT_SECRET || "default_local_secret_key_for_dev_only";
    const payload = await verify(token, secret, "HS256");
    c.set("user", payload);
    await next();
  } catch (err) {
    console.error("JWT Verification failed:", err);
    return c.json({ error: "Unauthorized: Invalid token" }, 401);
  }
};

app.use("/api/*", authMiddleware);
app.route("/api/ai",     openaiRouter);
app.route("/api/ocr",    openaiRouter);
app.route("/api/analytics", analyticsRouter);
app.route("/api/stats",  statsRouter);
app.route("/api/data",   dataRouter);
app.route("/api/external-jobs", externalJobsRouter);

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


export default app;
