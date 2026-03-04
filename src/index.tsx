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
import { serveStatic } from "hono/cloudflare-workers";
import openaiRouter from "./api/routes/openai";
import statsRouter from "./api/routes/stats";
import dataRouter from "./api/routes/data";

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

// ────────────────────────────────────────────────────────────────
// API ルーティング
// ────────────────────────────────────────────────────────────────
app.route("/api/ai",     openaiRouter);
app.route("/api/ocr",    openaiRouter);  // OCRルートも同じルーターに含む
app.route("/api/stats",  statsRouter);
app.route("/api/data",   dataRouter);

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
app.use("/assets/*", serveStatic({ root: "./" }));
app.use("/static/*", serveStatic({ root: "./" }));

// ────────────────────────────────────────────────────────────────
// SPA フォールバック（React Router に委ねる）
// すべての非APIルートは index.html を返す
// ────────────────────────────────────────────────────────────────
app.get("*", serveStatic({ root: "./" }));

export default app;
