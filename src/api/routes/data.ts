/**
 * src/api/routes/data.ts
 * Hono APIルート: Cloudflare D1 データ CRUD
 * 論文 4.2節: データ層（PostgreSQL 30テーブル → D1 SQLite移植版）
 *
 * 主要エンドポイント:
 *   /api/data/journals        - 実習日誌 CRUD
 *   /api/data/evaluations     - AI評価結果
 *   /api/data/human-evals     - 人間評価
 *   /api/data/self-evals      - 自己評価（週次）
 *   /api/data/chat-logs       - チャットログ
 *   /api/data/goals           - SMART目標
 *   /api/data/students        - 学生プロフィール
 *   /api/data/icc-results     - ICC結果保存
 *   /api/data/export          - CSV/Excelエクスポート
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
};

const dataRouter = new Hono<{ Bindings: Bindings }>();
dataRouter.use("*", cors());

// ────────────────────────────────────────────────────────────────
// DB 初期化（初回アクセス時にテーブルを作成）
// ────────────────────────────────────────────────────────────────
async function ensureSchema(db: D1Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      student_number TEXT,
      grade INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      entry_date TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      ocr_source TEXT,
      ocr_confidence REAL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, entry_date)
    );

    CREATE TABLE IF NOT EXISTS evaluations (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      eval_type TEXT NOT NULL DEFAULT 'ai',
      model_name TEXT DEFAULT 'gpt-4o',
      prompt_version TEXT DEFAULT 'CoT-A-v1.0',
      temperature REAL DEFAULT 0.2,
      total_score REAL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      overall_comment TEXT,
      reasoning TEXT,
      halo_effect_detected INTEGER DEFAULT 0,
      token_count INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
    );

    CREATE TABLE IF NOT EXISTS evaluation_items (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL,
      item_number INTEGER NOT NULL,
      score REAL,
      is_na INTEGER DEFAULT 0,
      evidence TEXT,
      feedback TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    );

    CREATE TABLE IF NOT EXISTS human_evaluations (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      evaluator_id TEXT NOT NULL,
      evaluator_name TEXT,
      total_score REAL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
    );

    CREATE TABLE IF NOT EXISTS human_eval_items (
      id TEXT PRIMARY KEY,
      human_eval_id TEXT NOT NULL,
      item_number INTEGER NOT NULL,
      score REAL,
      is_na INTEGER DEFAULT 0,
      comment TEXT,
      FOREIGN KEY (human_eval_id) REFERENCES human_evaluations(id)
    );

    CREATE TABLE IF NOT EXISTS self_evaluations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      journal_id TEXT,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      total_score REAL,
      rd_journal_level INTEGER,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, week_number)
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      journal_id TEXT,
      current_state TEXT DEFAULT 'phase0',
      phase_reached TEXT DEFAULT 'phase0',
      total_turns INTEGER DEFAULT 0,
      question_count INTEGER DEFAULT 0,
      max_rd_chat_level INTEGER DEFAULT 0,
      goal_set INTEGER DEFAULT 0,
      goal_is_smart INTEGER DEFAULT 0,
      session_duration_sec INTEGER DEFAULT 0,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      message_order INTEGER NOT NULL,
      phase TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      reflection_depth INTEGER,
      question_number INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      session_id TEXT,
      week_number INTEGER NOT NULL,
      goal_text TEXT NOT NULL,
      target_item_id INTEGER,
      target_factor TEXT,
      is_smart INTEGER DEFAULT 1,
      smart_specific INTEGER DEFAULT 1,
      smart_measurable INTEGER DEFAULT 1,
      smart_achievable INTEGER DEFAULT 1,
      smart_relevant INTEGER DEFAULT 1,
      smart_time_bound INTEGER DEFAULT 1,
      achieved INTEGER DEFAULT 0,
      evidence TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS icc_results (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      factor TEXT,
      icc_value REAL NOT NULL,
      ci_lower REAL,
      ci_upper REAL,
      f_value REAL,
      df1 INTEGER,
      df2 INTEGER,
      p_value REAL,
      interpretation TEXT,
      rater_count INTEGER,
      subject_count INTEGER,
      krippendorff_alpha REAL,
      pearson_r REAL,
      pearson_p REAL,
      calculated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bland_altman_results (
      id TEXT PRIMARY KEY,
      factor TEXT,
      mean_diff REAL,
      sd_diff REAL,
      loa_upper REAL,
      loa_lower REAL,
      ci_mean_upper REAL,
      ci_mean_lower REAL,
      outlier_ratio REAL,
      bias_p_value REAL,
      subject_count INTEGER,
      calculated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learning_progress_scores (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      total_score REAL,
      rd_journal_level INTEGER,
      ga_self INTEGER DEFAULT 0,
      ga_evidence INTEGER DEFAULT 0,
      growth_pattern TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, week_number)
    );

    CREATE INDEX IF NOT EXISTS idx_journals_student ON journal_entries(student_id);
    CREATE INDEX IF NOT EXISTS idx_evaluations_journal ON evaluations(journal_id);
    CREATE INDEX IF NOT EXISTS idx_human_evals_journal ON human_evaluations(journal_id);
    CREATE INDEX IF NOT EXISTS idx_self_evals_student ON self_evaluations(student_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_student ON chat_sessions(student_id);
    CREATE INDEX IF NOT EXISTS idx_goals_student ON goals(student_id);
    CREATE INDEX IF NOT EXISTS idx_lps_student ON learning_progress_scores(student_id);
  `);
}

// ────────────────────────────────────────────────────────────────
// ヘルパー
// ────────────────────────────────────────────────────────────────
function genId(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

// ────────────────────────────────────────────────────────────────
// 日誌 CRUD
// ────────────────────────────────────────────────────────────────
dataRouter.get("/journals", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const studentId = c.req.query("student_id");
  const limit = parseInt(c.req.query("limit") ?? "50");

  try {
    const query = studentId
      ? db.prepare("SELECT * FROM journal_entries WHERE student_id = ? ORDER BY entry_date DESC LIMIT ?").bind(studentId, limit)
      : db.prepare("SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT ?").bind(limit);

    const { results } = await query.all();
    return c.json({ success: true, journals: results, count: results.length });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.post("/journals", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as {
    student_id: string;
    entry_date: string;
    week_number: number;
    title?: string;
    content: string;
    status?: string;
    ocr_source?: string;
    ocr_confidence?: number;
  };

  try {
    const id = genId();
    const wordCount = body.content.replace(/\s/g, "").length;

    await db.prepare(`
      INSERT INTO journal_entries (id, student_id, entry_date, week_number, title, content, word_count, status, ocr_source, ocr_confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.student_id, body.entry_date, body.week_number,
      body.title ?? null, body.content, wordCount,
      body.status ?? "submitted",
      body.ocr_source ?? null, body.ocr_confidence ?? null,
      nowISO(), nowISO()
    ).run();

    return c.json({ success: true, id, word_count: wordCount });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/journals/:id", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const journal = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(c.req.param("id")).first();
  if (!journal) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true, journal });
});

// ────────────────────────────────────────────────────────────────
// AI評価結果の保存・取得
// ────────────────────────────────────────────────────────────────
dataRouter.post("/evaluations", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as {
    journal_id: string;
    evaluation: {
      items: Array<{ item_number: number; score: number; is_na?: boolean; evidence?: string; feedback?: string }>;
      factor_scores: { factor1: number; factor2: number; factor3: number; factor4: number };
      total_score: number;
      overall_comment: string;
      reasoning: string;
      halo_effect_detected: boolean;
    };
    model_name?: string;
    prompt_version?: string;
    temperature?: number;
    token_count?: number;
    duration_ms?: number;
  };

  try {
    const evalId = genId();
    await db.prepare(`
      INSERT INTO evaluations (id, journal_id, eval_type, model_name, prompt_version, temperature,
        total_score, factor1_score, factor2_score, factor3_score, factor4_score,
        overall_comment, reasoning, halo_effect_detected, token_count, duration_ms, created_at)
      VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      evalId, body.journal_id,
      body.model_name ?? "gpt-4o",
      body.prompt_version ?? "CoT-A-v1.0",
      body.temperature ?? 0.2,
      body.evaluation.total_score,
      body.evaluation.factor_scores.factor1,
      body.evaluation.factor_scores.factor2,
      body.evaluation.factor_scores.factor3,
      body.evaluation.factor_scores.factor4,
      body.evaluation.overall_comment,
      body.evaluation.reasoning,
      body.evaluation.halo_effect_detected ? 1 : 0,
      body.token_count ?? null,
      body.duration_ms ?? null,
      nowISO()
    ).run();

    // 23項目を保存
    for (const item of body.evaluation.items) {
      await db.prepare(`
        INSERT INTO evaluation_items (id, evaluation_id, item_number, score, is_na, evidence, feedback, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        genId(), evalId, item.item_number,
        item.score ?? null,
        item.is_na ? 1 : 0,
        item.evidence ?? null,
        item.feedback ?? null,
        nowISO()
      ).run();
    }

    return c.json({ success: true, evaluation_id: evalId });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/evaluations/:journalId", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const eval_ = await db.prepare(
      "SELECT * FROM evaluations WHERE journal_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(c.req.param("journalId")).first();

    if (!eval_) return c.json({ error: "Not found" }, 404);

    const items = await db.prepare(
      "SELECT * FROM evaluation_items WHERE evaluation_id = ? ORDER BY item_number"
    ).bind((eval_ as { id: string }).id).all();

    return c.json({ success: true, evaluation: eval_, items: items.results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// 人間評価
// ────────────────────────────────────────────────────────────────
dataRouter.post("/human-evals", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as {
    journal_id: string;
    evaluator_id: string;
    evaluator_name: string;
    items: Array<{ item_number: number; score: number; is_na?: boolean; comment?: string }>;
  };

  try {
    const scores = { f1: [] as number[], f2: [] as number[], f3: [] as number[], f4: [] as number[] };
    body.items.forEach((item) => {
      if (item.is_na || !item.score) return;
      if (item.item_number <= 7) scores.f1.push(item.score);
      else if (item.item_number <= 13) scores.f2.push(item.score);
      else if (item.item_number <= 17) scores.f3.push(item.score);
      else scores.f4.push(item.score);
    });

    const avg = (arr: number[]) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null;
    const allScores = [...scores.f1, ...scores.f2, ...scores.f3, ...scores.f4];

    const id = genId();
    await db.prepare(`
      INSERT INTO human_evaluations (id, journal_id, evaluator_id, evaluator_name,
        total_score, factor1_score, factor2_score, factor3_score, factor4_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.journal_id, body.evaluator_id, body.evaluator_name,
      avg(allScores), avg(scores.f1), avg(scores.f2), avg(scores.f3), avg(scores.f4),
      nowISO()
    ).run();

    for (const item of body.items) {
      await db.prepare(`
        INSERT INTO human_eval_items (id, human_eval_id, item_number, score, is_na, comment)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(genId(), id, item.item_number, item.score ?? null, item.is_na ? 1 : 0, item.comment ?? null).run();
    }

    return c.json({ success: true, human_eval_id: id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// 自己評価（週次）
// ────────────────────────────────────────────────────────────────
dataRouter.post("/self-evals", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as {
    student_id: string;
    week_number: number;
    journal_id?: string;
    factor1_score: number;
    factor2_score: number;
    factor3_score: number;
    factor4_score: number;
    rd_journal_level?: number;
    comment?: string;
  };

  try {
    const total = (body.factor1_score + body.factor2_score + body.factor3_score + body.factor4_score) / 4;
    const id = genId();

    await db.prepare(`
      INSERT OR REPLACE INTO self_evaluations
        (id, student_id, week_number, journal_id, factor1_score, factor2_score, factor3_score, factor4_score,
         total_score, rd_journal_level, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.student_id, body.week_number, body.journal_id ?? null,
      body.factor1_score, body.factor2_score, body.factor3_score, body.factor4_score,
      Math.round(total * 100) / 100,
      body.rd_journal_level ?? null, body.comment ?? null, nowISO()
    ).run();

    return c.json({ success: true, self_eval_id: id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/self-evals/:studentId", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const { results } = await db.prepare(
    "SELECT * FROM self_evaluations WHERE student_id = ? ORDER BY week_number"
  ).bind(c.req.param("studentId")).all();

  return c.json({ success: true, self_evaluations: results });
});

// ────────────────────────────────────────────────────────────────
// SMART目標
// ────────────────────────────────────────────────────────────────
dataRouter.post("/goals", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as {
    student_id: string;
    session_id?: string;
    week_number: number;
    goal_text: string;
    target_item_id?: number;
    target_factor?: string;
    is_smart?: boolean;
    smart_criteria?: Record<string, boolean>;
  };

  try {
    const id = genId();
    const sc = body.smart_criteria ?? {};

    await db.prepare(`
      INSERT INTO goals (id, student_id, session_id, week_number, goal_text, target_item_id, target_factor,
        is_smart, smart_specific, smart_measurable, smart_achievable, smart_relevant, smart_time_bound, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.student_id, body.session_id ?? null, body.week_number, body.goal_text,
      body.target_item_id ?? null, body.target_factor ?? null,
      body.is_smart ? 1 : 0,
      sc.specific ? 1 : 0, sc.measurable ? 1 : 0, sc.achievable ? 1 : 0,
      sc.relevant ? 1 : 0, sc.time_bound ? 1 : 0,
      nowISO()
    ).run();

    return c.json({ success: true, goal_id: id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/goals/:studentId", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const { results } = await db.prepare(
    "SELECT * FROM goals WHERE student_id = ? ORDER BY week_number DESC"
  ).bind(c.req.param("studentId")).all();

  return c.json({ success: true, goals: results });
});

// ────────────────────────────────────────────────────────────────
// ICC結果保存
// ────────────────────────────────────────────────────────────────
dataRouter.post("/icc-results", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as {
    scope: string;
    factor?: string;
    icc_value: number;
    ci_lower?: number;
    ci_upper?: number;
    f_value?: number;
    df1?: number;
    df2?: number;
    p_value?: number;
    interpretation?: string;
    rater_count?: number;
    subject_count?: number;
    krippendorff_alpha?: number;
    pearson_r?: number;
    pearson_p?: number;
  };

  try {
    await db.prepare(`
      INSERT INTO icc_results (id, scope, factor, icc_value, ci_lower, ci_upper, f_value, df1, df2,
        p_value, interpretation, rater_count, subject_count, krippendorff_alpha, pearson_r, pearson_p, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      genId(), body.scope, body.factor ?? "total",
      body.icc_value, body.ci_lower ?? null, body.ci_upper ?? null,
      body.f_value ?? null, body.df1 ?? null, body.df2 ?? null,
      body.p_value ?? null, body.interpretation ?? null,
      body.rater_count ?? null, body.subject_count ?? null,
      body.krippendorff_alpha ?? null, body.pearson_r ?? null, body.pearson_p ?? null,
      nowISO()
    ).run();

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// 学生一覧・成長データ取得（研究者用）
// ────────────────────────────────────────────────────────────────
dataRouter.get("/students", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const { results } = await db.prepare(
    "SELECT * FROM users WHERE role = 'student' ORDER BY student_number"
  ).all();

  return c.json({ success: true, students: results });
});

dataRouter.get("/growth/:studentId", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const studentId = c.req.param("studentId");

  const [selfEvals, goals, chatLogs] = await Promise.all([
    db.prepare("SELECT * FROM self_evaluations WHERE student_id = ? ORDER BY week_number").bind(studentId).all(),
    db.prepare("SELECT * FROM goals WHERE student_id = ? ORDER BY week_number").bind(studentId).all(),
    db.prepare("SELECT * FROM chat_sessions WHERE student_id = ? ORDER BY created_at").bind(studentId).all(),
  ]);

  return c.json({
    success: true,
    student_id: studentId,
    weekly_scores: selfEvals.results,
    goals: goals.results,
    chat_sessions: chatLogs.results,
  });
});

// ────────────────────────────────────────────────────────────────
// CSV エクスポート
// ────────────────────────────────────────────────────────────────
dataRouter.get("/export/evaluations-csv", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const { results } = await db.prepare(`
      SELECT
        je.student_id, je.week_number, je.entry_date,
        e.total_score, e.factor1_score, e.factor2_score, e.factor3_score, e.factor4_score,
        e.halo_effect_detected, e.overall_comment, e.model_name
      FROM evaluations e
      JOIN journal_entries je ON e.journal_id = je.id
      WHERE e.eval_type = 'ai'
      ORDER BY je.student_id, je.week_number
    `).all();

    const headers = [
      "student_id", "week_number", "entry_date",
      "total_score", "factor1_score", "factor2_score", "factor3_score", "factor4_score",
      "halo_effect_detected", "overall_comment", "model_name"
    ];

    const rows = results.map((r) =>
      headers.map((h) => {
        const v = (r as Record<string, unknown>)[h];
        const s = v === null || v === undefined ? "" : String(v);
        return s.includes(",") ? `"${s}"` : s;
      }).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"ai_evaluations.csv\"",
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/export/reliability-csv", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const { results } = await db.prepare(`
      SELECT
        icc_value, ci_lower, ci_upper, f_value, df1, df2, p_value,
        interpretation, rater_count, subject_count,
        krippendorff_alpha, pearson_r, pearson_p,
        scope, factor, calculated_at
      FROM icc_results
      ORDER BY calculated_at DESC
    `).all();

    const headers = [
      "scope", "factor", "icc_value", "ci_lower", "ci_upper",
      "f_value", "df1", "df2", "p_value", "interpretation",
      "rater_count", "subject_count",
      "krippendorff_alpha", "pearson_r", "pearson_p", "calculated_at"
    ];

    const rows = results.map((r) =>
      headers.map((h) => {
        const v = (r as Record<string, unknown>)[h];
        return v === null || v === undefined ? "" : String(v);
      }).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=\"reliability_results.csv\"",
      },
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

export default dataRouter;
