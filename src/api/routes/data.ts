// @ts-nocheck
import { UserRole } from "../../types";
import { applyAnonymization } from "../services/anonymization";
import { getFactorKeyByItemNum, RUBRIC_ITEMS } from "../../constants/rubric";

/**
 * 6因子40項目ルーブリックに基づき、AI/人間評価のitem配列から
 * 総合スコア・各因子平均（factor1〜factor6）・評価済み項目数を算出する。
 * 因子割り当ては getFactorKeyByItemNum で項目番号から決定する。
 */
function computeFactorAverages(
  items: Array<{ item_number: number; score?: number | null; is_na?: boolean }>,
) {
  const buckets: Record<string, number[]> = {
    factor1: [], factor2: [], factor3: [], factor4: [], factor5: [], factor6: [],
  };
  for (const it of items) {
    if (it.is_na || it.score == null || !it.score) continue;
    const fk = getFactorKeyByItemNum(it.item_number);
    buckets[fk].push(it.score as number);
  }
  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : null;
  const all = ([] as number[]).concat(
    buckets.factor1, buckets.factor2, buckets.factor3,
    buckets.factor4, buckets.factor5, buckets.factor6,
  );
  return {
    total: avg(all) ?? 0,
    f1: avg(buckets.factor1),
    f2: avg(buckets.factor2),
    f3: avg(buckets.factor3),
    f4: avg(buckets.factor4),
    f5: avg(buckets.factor5),
    f6: avg(buckets.factor6),
    evaluatedCount: all.length,
  };
}

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
import exportsRouter from "./exports";
import analysisRouter from "./analysisState";
import journalImportsRouter from "./journalImports";
import { markScatDependentsDirty } from "../services/scatDerivedAnalysis";
import { requireWeekNumber } from "../utils/validation";
import { cors } from "hono/cors";
import { requireRoles } from "../middleware/auth";
import { getScopeContext, buildScopeFilter, assertCanAccessStudent } from "../middleware/scope";
import { setAuditReadContext, setAuditWriteContext } from "../middleware/audit";
import { callOpenAI, buildCoTAPrompt, buildSCATPrompt, buildBfiIntegratedPrompt, extractJournalText, resolveModel, getChatCompletionsUrl } from "./openai";

type Bindings = {
  DB: D1Database;
  KV: KVNamespace;
};

const dataRouter = new Hono<{ Bindings: Bindings }>();
dataRouter.use("*", cors());

// ────────────────────────────────────────────────────────────────
// スコア → RD レベル変換 (Reflection Depth: RD0〜RD4)
// 教育心理学的省察の深さレベルに基づく分類
// RD0: 記述なし (score 0 or NA)
// RD1: 事実のみ (score 1)
// RD2: 感想・気づき言語化 (score 2-3)
// RD3: 原因分析・代替案検討 (score 4)
// RD4: 信念・前提を問い直す批判的省察 (score 5)
// ────────────────────────────────────────────────────────────────
function scoreToRdLevel(score: number | null | undefined): string | null {
  if (score === null || score === undefined || isNaN(Number(score))) return null;
  const s = Number(score);
  if (s >= 4.5) return "RD4";
  if (s >= 3.5) return "RD3";
  if (s >= 2.5) return "RD2";
  if (s >= 1.5) return "RD1";
  if (s >= 0.5) return "RD0";
  return null;
}

// ────────────────────────────────────────────────────────────────
// DB 初期化（初回アクセス時にテーブルを作成）
// ────────────────────────────────────────────────────────────────
async function ensureSchema(db: D1Database): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      student_number TEXT,
      grade INTEGER,
      password_hash TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS evaluator_profiles (
      evaluator_id TEXT PRIMARY KEY,
      years_of_experience INTEGER,
      training_background TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS journal_entries (
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
    );`,
    `CREATE TABLE IF NOT EXISTS evaluations (
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
      factor5_score REAL,
      factor6_score REAL,
      overall_comment TEXT,
      reasoning TEXT,
      halo_effect_detected INTEGER DEFAULT 0,
      token_count INTEGER,
      duration_ms INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
    );`,
    `CREATE TABLE IF NOT EXISTS evaluation_items (
      id TEXT PRIMARY KEY,
      evaluation_id TEXT NOT NULL,
      item_number INTEGER NOT NULL,
      score REAL,
      rd_level TEXT,
      is_na INTEGER DEFAULT 0,
      evidence TEXT,
      feedback TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (evaluation_id) REFERENCES evaluations(id)
    );`,
    `CREATE TABLE IF NOT EXISTS human_evaluations (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      evaluator_id TEXT NOT NULL,
      evaluator_name TEXT,
      total_score REAL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      factor5_score REAL,
      factor6_score REAL,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
    );`,
    `CREATE TABLE IF NOT EXISTS human_eval_items (
      id TEXT PRIMARY KEY,
      human_eval_id TEXT NOT NULL,
      item_number INTEGER NOT NULL,
      score REAL,
      rd_level TEXT,
      is_na INTEGER DEFAULT 0,
      comment TEXT,
      FOREIGN KEY (human_eval_id) REFERENCES human_evaluations(id)
    );`,
    `CREATE TABLE IF NOT EXISTS rubric_item_behaviors (
      id TEXT PRIMARY KEY,
      item_number INTEGER NOT NULL,
      factor TEXT NOT NULL,
      item_label TEXT NOT NULL,
      item_text TEXT NOT NULL,
      lambda REAL,
      score INTEGER NOT NULL,
      rd_level TEXT NOT NULL,
      indicator TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(item_number, score)
    );`,
    `CREATE TABLE IF NOT EXISTS self_evaluations (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      journal_id TEXT,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      factor5_score REAL,
      factor6_score REAL,
      total_score REAL,
      rd_journal_level INTEGER,
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, week_number)
    );`,
    `CREATE TABLE IF NOT EXISTS chat_sessions (
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
    );`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
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
    );`,
    `CREATE TABLE IF NOT EXISTS goals (
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
      difficulty_level TEXT,
      adjustment_reason TEXT,
      bfi_context TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS icc_results (
      id TEXT PRIMARY KEY,
      run_id TEXT,
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
    );`,
    `CREATE TABLE IF NOT EXISTS bland_altman_results (
      id TEXT PRIMARY KEY,
      run_id TEXT,
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
    );`,
    
    `CREATE TABLE IF NOT EXISTS journal_scat_analyses (
      id TEXT PRIMARY KEY,
      journal_id TEXT NOT NULL,
      user_id TEXT,
      analysis_status TEXT DEFAULT 'pending',
      storyline TEXT,
      theoretical_description TEXT,
      is_human_reviewed BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS journal_scat_segments (
      id TEXT PRIMARY KEY,
      analysis_id TEXT NOT NULL,
      journal_id TEXT NOT NULL,
      segment_order INTEGER NOT NULL,
      raw_text TEXT NOT NULL,
      step1_focus_words TEXT,
      step2_outside_words TEXT,
      step3_explanatory_words TEXT,
      step4_theme_construct TEXT,
      step5_questions_issues TEXT,
      memo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE IF NOT EXISTS scat_projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      storyline TEXT,
      theoretical_description TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS scat_segments (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      segment_order INTEGER NOT NULL,
      text_content TEXT NOT NULL,
      source_journal_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS scat_codes (
      id TEXT PRIMARY KEY,
      segment_id TEXT NOT NULL,
      researcher_id TEXT NOT NULL,
      step1_keywords TEXT,
      step2_thesaurus TEXT,
      step3_concept TEXT,
      step4_theme TEXT,
      memo TEXT,
      factor TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(segment_id, researcher_id)
    );`,
    `CREATE TABLE IF NOT EXISTS learning_progress_scores (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      factor1_score REAL,
      factor2_score REAL,
      factor3_score REAL,
      factor4_score REAL,
      factor5_score REAL,
      factor6_score REAL,
      total_score REAL,
      rd_journal_level INTEGER,
      ga_self INTEGER DEFAULT 0,
      ga_evidence INTEGER DEFAULT 0,
      growth_pattern TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, week_number)
    );`,
    `CREATE TABLE IF NOT EXISTS rq3b_outcomes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      goal_id TEXT,
      stage TEXT NOT NULL,
      reflection_depth INTEGER,
      goal_set INTEGER,
      smart_score INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS bfi_responses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      openness REAL,
      conscientiousness REAL,
      extraversion REAL,
      agreeableness REAL,
      neuroticism REAL,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id)
    );`,
    // 並川式 29 項目 BFI 回答テーブル (item_id 単位)
    `CREATE TABLE IF NOT EXISTS namikawa_bfi_responses (
      user_id TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, item_id)
    );`,
    // ユーザ単位の BFI 5 因子スコア集計テーブル
    `CREATE TABLE IF NOT EXISTS user_bfi_scores (
      user_id TEXT PRIMARY KEY,
      extraversion REAL,
      neuroticism REAL,
      openness REAL,
      agreeableness REAL,
      conscientiousness REAL,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE INDEX IF NOT EXISTS idx_journals_student ON journal_entries(student_id);`,
    `CREATE INDEX IF NOT EXISTS idx_evaluations_journal ON evaluations(journal_id);`,
    `CREATE INDEX IF NOT EXISTS idx_human_evals_journal ON human_evaluations(journal_id);`,
    `CREATE INDEX IF NOT EXISTS idx_self_evals_student ON self_evaluations(student_id);`,
    `CREATE INDEX IF NOT EXISTS idx_chat_sessions_student ON chat_sessions(student_id);`,
    `CREATE INDEX IF NOT EXISTS idx_goals_student ON goals(student_id);`,
    `CREATE INDEX IF NOT EXISTS idx_lps_student ON learning_progress_scores(student_id);`
  ];

  try {
    for (const stmt of statements) {
      await db.prepare(stmt).run();
    }

    
  try {
    await db.prepare("ALTER TABLE users ADD COLUMN password_hash TEXT;").run();
  } catch(e) {
    // Ignore if column already exists
  }

    // デモユーザーの初期化
    const usersCount = await db.prepare("SELECT COUNT(*) as count FROM users").first();
    if (usersCount && usersCount.count === 0) {
      await db.prepare(`
        INSERT INTO users (id, email, name, role, student_number, grade, password_hash) VALUES 
        ('user-001', 'student@teaching-eval.jp', '山田 太郎', 'student', '2023A001', 3, '$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6'),
        ('user-002', 'teacher@teaching-eval.jp', '佐藤 花子', 'univ_teacher', null, null, '$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6'),
        ('user-003', 'mentor@teaching-eval.jp', '鈴木 一郎', 'school_mentor', null, null, '$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6'),
        ('user-004', 'admin@teaching-eval.jp', '田中 管理者', 'admin', null, null, '$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6'),
        ('user-005', 'researcher@teaching-eval.jp', '伊藤 研究者', 'researcher', null, null, '$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6'),
        ('user-006', 'collaborator@teaching-eval.jp', '渡辺 協力者', 'collaborator', null, null, '$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6'),
        ('user-007', 'observer@teaching-eval.jp', '中村 委員', 'board_observer', null, null, '$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6'),
        ('user-008', 'evaluator@teaching-eval.jp', '小林 評価者', 'evaluator', null, null, '$2b$10$lHMsxgQ9lQLjT98iedCPm..oZV4CKKRk3u6sq8XlSmRUEy0weKdh6')
      `).run();
    }

  } catch (err) {
    console.error("Schema initialization error:", err);
  }
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
dataRouter.get("/journals", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const studentId = c.req.query("student_id");
  const limit = parseInt(c.req.query("limit") ?? "50");

  try {
    const scope = await getScopeContext(c, db);
    const { condition, params } = buildScopeFilter(scope, "student_id");
    
    let query;
    if (studentId) {
      if (!assertCanAccessStudent(scope, studentId)) {
        return c.json({ success: false, error: "forbidden", message: "この学生のデータにアクセスする権限がありません。" }, 403);
      }
      // 学生名を JOIN で取得し、一覧表示時に「誰の日誌か」を識別できるようにする
      query = db.prepare(`
        SELECT j.*, u.name as student_name
        FROM journal_entries j
        LEFT JOIN users u ON u.id = j.student_id
        WHERE j.student_id = ?
        ORDER BY j.entry_date DESC LIMIT ?
      `).bind(studentId, limit);
    } else {
      query = db.prepare(`
        SELECT j.*, u.name as student_name
        FROM journal_entries j
        LEFT JOIN users u ON u.id = j.student_id
        WHERE ${condition.replace(/student_id/g, "j.student_id")}
        ORDER BY j.entry_date DESC LIMIT ?
      `).bind(...params, limit);
    }

    const { results } = await query.all();
    
    // Audit log
    const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id)));
    setAuditReadContext(c, {
      resourceType: 'journal',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    const role = ((c.get("user" as any) as any) as any)?.role;
    const anonLevel = scope.anonymizationLevel;
    let finalResults = results;
    if (anonLevel && role !== "admin") {
      finalResults = applyAnonymization(results, { role, anonymizationLevel: anonLevel, resourceType: "journal" });
    }
    
    // Audit log
    {
      const distIds = Array.from(new Set(results.map((r: any) => r.student_id)));
      setAuditReadContext(c, {
        resourceType: 'journal',
        targetStudentIds: distIds as string[],
        visibleRecordCount: finalResults.length,
        scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned",
        reason: anonLevel ? `anonymization:${anonLevel}` : undefined
      });
    }

    return c.json({ success: true, journals: finalResults, count: finalResults.length });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────
// 通知ヘルパ (notifications テーブルへ INSERT)
// 主体: 学生がジャーナル提出 → 受信者: 教員/指導教員/研究者
// ──────────────────────────────────────────────────────────────────
async function ensureNotificationsSchema(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_user_id TEXT NOT NULL,
      actor_user_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      resource_type TEXT,
      resource_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run().catch(() => {});
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_user_id, is_read, created_at)`).run().catch(() => {});
}

async function sendNotifications(
  db: D1Database,
  recipients: string[],
  payload: { actor_user_id?: string; type: string; title: string; body?: string; resource_type?: string; resource_id?: string }
): Promise<number> {
  if (!recipients || recipients.length === 0) return 0;
  await ensureNotificationsSchema(db);
  let inserted = 0;
  for (const recipient of recipients) {
    try {
      const nid = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await db.prepare(`
        INSERT INTO notifications (id, recipient_user_id, actor_user_id, type, title, body, resource_type, resource_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
      `).bind(
        nid, recipient, payload.actor_user_id || null,
        payload.type, payload.title, payload.body || null,
        payload.resource_type || null, payload.resource_id || null
      ).run();
      inserted++;
    } catch (e) {
      console.error("Notification insert failed:", String(e));
    }
  }
  return inserted;
}

// 学生が日誌提出した時、誰に通知すべきか判定
//   - 指導教員 (student_teacher_assignments テーブル)
//   - クラス担当教員 (students.class_id → teacher_class_assignments)
//   - フォールバック: 全 teacher/univ_teacher/school_mentor
async function resolveStudentSupervisors(db: D1Database, studentId: string): Promise<string[]> {
  const recipients = new Set<string>();
  try {
    const { results: assignments } = await db.prepare(`
      SELECT teacher_id FROM student_teacher_assignments WHERE student_id = ?
    `).bind(studentId).all().catch(() => ({ results: [] as any[] }));
    for (const a of (assignments as any[]) || []) {
      if (a.teacher_id) recipients.add(String(a.teacher_id));
    }
  } catch {}
  // フォールバック: assignments が空の場合は teacher/univ_teacher を対象
  if (recipients.size === 0) {
    try {
      const { results: teachers } = await db.prepare(`
        SELECT id FROM users WHERE role IN ('teacher', 'univ_teacher', 'school_mentor') LIMIT 10
      `).all().catch(() => ({ results: [] as any[] }));
      for (const t of (teachers as any[]) || []) {
        if (t.id) recipients.add(String(t.id));
      }
    } catch {}
  }
  return Array.from(recipients);
}

// ──────────────────────────────────────────────────────────────────
// 共通: 自動連動パイプライン (AI評価 + SCAT + 通知 + キャッシュ無効化)
// POST /journals, PUT /journals/:id (draft→submitted) で共有使用
// ──────────────────────────────────────────────────────────────────
async function runJournalAutoPipeline(
  db: D1Database,
  apiKey: string | undefined,
  params: { journalId: string; studentId: string; studentName: string; weekNumber: number; content: string },
  env?: any
): Promise<any> {
  const { journalId, studentId, studentName, weekNumber, content } = params;
  const pipelineResult: any = { evaluation_saved: false, scat_saved: false, notifications_sent: 0, cache_invalidated: false };
  // OpenAI 互換エンドポイント / モデルを env から解決（未設定時は公式 gpt-4o）
  const aiModel = resolveModel(env);
  const aiBaseUrl = getChatCompletionsUrl(env).replace(/\/chat\/completions$/, "");

  // ① AI評価
  if (apiKey) {
    try {
      const prompt = buildCoTAPrompt(extractJournalText(content), studentName, weekNumber);
      const raw = await callOpenAI(apiKey, [{ role: "user", content: prompt }], 0.2, aiModel, { baseUrl: aiBaseUrl });
      const aiResult = JSON.parse(raw);

      if (aiResult.items && Array.isArray(aiResult.items)) {
        const fa = computeFactorAverages(aiResult.items);
        const totalScore = fa.total;
        const f1 = fa.f1, f2 = fa.f2, f3 = fa.f3, f4 = fa.f4, f5 = fa.f5, f6 = fa.f6;

        const evalId = "auto-eval-" + journalId + "-" + Date.now();
        await db.prepare(`
          INSERT INTO evaluations (id, journal_id, eval_type, model_name, prompt_version, temperature, total_score, factor1_score, factor2_score, factor3_score, factor4_score, factor5_score, factor6_score, overall_comment, reasoning, token_count, duration_ms, created_at)
          VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, CURRENT_TIMESTAMP)
        `).bind(
          evalId, journalId, aiModel, "CoT-A-v1.0", 0.2, totalScore, f1, f2, f3, f4, f5, f6,
          String((aiResult as any).overall_comment || ""),
          String(aiResult.reasoning || "")
        ).run();

        for (const it of aiResult.items as any[]) {
          if (it.is_na) continue;
          const rdLevel = (it.rd_level as string | undefined) || scoreToRdLevel(it.score);
          await db.prepare(`
            INSERT INTO evaluation_items (id, evaluation_id, item_number, score, rd_level, evidence, feedback, is_na)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
          `).bind(
            `${evalId}-item-${it.item_number}`, evalId, it.item_number, it.score || null,
            rdLevel,
            String(it.evidence || it.reasoning || ""), String(it.feedback || it.note || "")
          ).run().catch(() => {});
        }
        pipelineResult.evaluation_saved = true;
        pipelineResult.evaluation_id = evalId;
        pipelineResult.total_score = totalScore;
      }
    } catch (eAi) {
      console.error("Auto AI evaluation failed:", String(eAi));
      pipelineResult.evaluation_error = String(eAi).slice(0, 200);
    }
  }

  // ② SCAT 自動分析
  //   - 第1選択: LLM (gpt-4o) による本格的な4ステップコーディング (Otani 2008/2011)
  //   - フォールバック: APIキー無 or LLM失敗時はキーワード辞書ベースの簡易版
  try {
    const journalText = extractJournalText(content);
    let scatSource: "llm" | "fallback" = "fallback";
    let llmResult: any = null;

    if (apiKey && journalText.length > 30) {
      try {
        const scatPrompt = buildSCATPrompt(journalText, studentName, weekNumber);
        const raw = await callOpenAI(apiKey, [{ role: "user", content: scatPrompt }], 0.4, aiModel, { baseUrl: aiBaseUrl });
        llmResult = JSON.parse(raw);
        if (llmResult && Array.isArray(llmResult.segments) && llmResult.segments.length > 0
          && typeof llmResult.storyline === "string" && llmResult.storyline.length > 50) {
          scatSource = "llm";
        } else {
          llmResult = null;
        }
      } catch (eLlmScat) {
        console.error("LLM SCAT failed, falling back to dictionary:", String(eLlmScat));
        pipelineResult.scat_llm_error = String(eLlmScat).slice(0, 200);
        llmResult = null;
      }
    }

    const analysisId = "auto-scat-" + journalId + "-" + Date.now();
    let storyline: string;
    let theoreticalDescription: string;
    let primaryThemes: string[] = [];
    let rdLevelEstimate: string | null = null;
    let segmentsToInsert: Array<{
      raw_text: string;
      step1: string; step2: string; step3: string; step4: string; step5: string;
    }> = [];

    if (scatSource === "llm" && llmResult) {
      // LLM 結果を採用
      storyline = String(llmResult.storyline).slice(0, 2000);
      theoreticalDescription = String(llmResult.theoretical_description || "").slice(0, 2000);
      primaryThemes = Array.isArray(llmResult.primary_themes) ? llmResult.primary_themes.slice(0, 5).map(String) : [];
      rdLevelEstimate = typeof llmResult.rd_level_estimate === "string" ? llmResult.rd_level_estimate : null;
      segmentsToInsert = (llmResult.segments as any[]).slice(0, 6).map((s: any, idx: number) => ({
        raw_text: String(s.raw_text || `セグメント${idx + 1}`).slice(0, 1000),
        step1: String(s.step1_focus_words || "").slice(0, 500),
        step2: String(s.step2_outside_words || "").slice(0, 500),
        step3: String(s.step3_explanatory_words || "").slice(0, 500),
        step4: String(s.step4_theme_construct || "").slice(0, 200),
        step5: String(s.step5_questions_issues || "").slice(0, 500),
      }));
    } else {
      // フォールバック (従来の辞書ベース)
      const themeDict: Array<{ keys: string[]; pair: [string, string] }> = [
        { keys: ["教材", "準備", "指導案", "プラン"], pair: ["授業準備", "教材研究"] },
        { keys: ["個別", "支援", "つまずき", "苦手", "得意"], pair: ["生徒指導", "個別支援"] },
        { keys: ["振り返", "反省", "気づ", "省察", "改善"], pair: ["振り返り", "省察"] },
        { keys: ["時間", "進度", "テンポ", "管理", "規律"], pair: ["時間管理", "学級経営"] },
        { keys: ["観察", "発問", "問いかけ", "判断", "反応"], pair: ["教師観察", "教師の判断"] },
        { keys: ["協働", "話し合い", "グループ", "対話"], pair: ["協働学習", "対話的学び"] },
        { keys: ["評価", "ルーブリック", "フィードバック"], pair: ["学習評価", "教育的判断"] },
      ];
      const scored = themeDict.map(t => ({
        pair: t.pair,
        score: t.keys.reduce((s, k) => s + (journalText.includes(k) ? 1 : 0), 0),
      }));
      scored.sort((a, b) => b.score - a.score);
      const pair: [string, string] = scored[0].score > 0
        ? scored[0].pair
        : themeDict[Math.floor(Math.random() * themeDict.length)].pair;
      primaryThemes = pair;
      // 生の content (JSON文字列) ではなく extractJournalText で抽出した本文を表示する。
      // 以前は content.slice(0,80) が {"version":2,...} を露出させていた。
      storyline = `第${weekNumber}週、${studentName}は「${pair[0]}」「${pair[1]}」に関する省察を記述している。冒頭: 「${journalText.slice(0, 80).replace(/\s+/g, " ")}…」 文章全体としては、教育的判断と児童理解の往還が観察される。`;
      theoreticalDescription = `本日誌は、教師の${pair[0]}行為と${pair[1]}の関係を、実践の事後省察として記述している。RD2〜RD3 水準の省察深度であり、児童の反応を媒介とした実践知の言語化が進行中。`;

      const chunkSize = Math.max(80, Math.ceil(journalText.length / 3));
      const numSeg = Math.min(3, Math.ceil(journalText.length / chunkSize));
      for (let i = 0; i < numSeg; i++) {
        const segText = journalText.slice(i * chunkSize, (i + 1) * chunkSize);
        const focusWord = pair[i % 2];
        segmentsToInsert.push({
          raw_text: segText || `セグメント${i + 1}`,
          step1: focusWord,
          step2: "授業の流れ、児童の反応",
          step3: `${focusWord}に関わる教育的判断`,
          step4: focusWord,
          step5: "次回の改善点を検討する",
        });
      }
    }

    // analysis_source カラム自動補強 (既存DBに無ければ追加)
    await db.prepare(`ALTER TABLE journal_scat_analyses ADD COLUMN analysis_source TEXT`).run().catch(() => {});
    await db.prepare(`ALTER TABLE journal_scat_analyses ADD COLUMN rd_level_estimate TEXT`).run().catch(() => {});
    await db.prepare(`ALTER TABLE journal_scat_analyses ADD COLUMN primary_themes TEXT`).run().catch(() => {});

    await db.prepare(`
      INSERT INTO journal_scat_analyses (id, journal_id, user_id, analysis_status, storyline, theoretical_description, analysis_source, rd_level_estimate, primary_themes, created_at, updated_at)
      VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      analysisId, journalId, studentId, storyline, theoreticalDescription,
      scatSource, rdLevelEstimate, JSON.stringify(primaryThemes)
    ).run();

    for (let i = 0; i < segmentsToInsert.length; i++) {
      const seg = segmentsToInsert[i];
      await db.prepare(`
        INSERT INTO journal_scat_segments (id, analysis_id, journal_id, segment_order, raw_text, step1_focus_words, step2_outside_words, step3_explanatory_words, step4_theme_construct, step5_questions_issues, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        `${analysisId}-seg-${i}`, analysisId, journalId, i + 1,
        seg.raw_text, seg.step1, seg.step2, seg.step3, seg.step4, seg.step5
      ).run().catch(() => {});
    }
    pipelineResult.scat_saved = true;
    pipelineResult.analysis_id = analysisId;
    pipelineResult.scat_source = scatSource;
    pipelineResult.scat_themes = primaryThemes;
    pipelineResult.scat_segments_count = segmentsToInsert.length;
    pipelineResult.scat_storyline_len = storyline.length;
    pipelineResult.scat_rd_estimate = rdLevelEstimate;
  } catch (eScat) {
    console.error("Auto SCAT analysis failed:", String(eScat));
    pipelineResult.scat_error = String(eScat).slice(0, 200);
  }

  // ③ 通知送信 (指導教員 + 研究者)
  try {
    const supervisors = await resolveStudentSupervisors(db, studentId);
    const { results: researchers } = await db.prepare(
      `SELECT id FROM users WHERE role IN ('researcher','admin') LIMIT 5`
    ).all().catch(() => ({ results: [] as any[] }));
    const researcherIds = (researchers as any[]).map(r => String(r.id));
    const recipients = Array.from(new Set([...supervisors, ...researcherIds]));

    const title = `${studentName} さんの実習日誌が提出されました (第${weekNumber}週)`;
    const bodyText = pipelineResult.evaluation_saved
      ? `AI評価完了 (総合スコア: ${pipelineResult.total_score?.toFixed(2)})。SCATテーマ: ${(pipelineResult.scat_themes || []).join(", ")}`
      : "AI評価は未完了です。手動で実行してください。";

    const sent = await sendNotifications(db, recipients, {
      actor_user_id: studentId,
      type: "journal_submitted",
      title,
      body: bodyText,
      resource_type: "journal",
      resource_id: journalId,
    });
    pipelineResult.notifications_sent = sent;
    pipelineResult.notified_recipients = recipients;
  } catch (eNotif) {
    console.error("Notification dispatch failed:", String(eNotif));
    pipelineResult.notification_error = String(eNotif).slice(0, 200);
  }

  // ④ 統計キャッシュ無効化 (該当学生のキャッシュエントリを削除)
  try {
    await ensureStatsCacheSchema(db);
    await db.prepare(
      `DELETE FROM stats_cache WHERE cache_key LIKE ? OR cache_key LIKE 'stats:global:%' OR cache_key LIKE 'stats:scat:%'`
    ).bind(`stats:student:${studentId}:%`).run().catch(() => {});
    pipelineResult.cache_invalidated = true;
  } catch (eCache) {
    pipelineResult.cache_error = String(eCache).slice(0, 200);
  }

  return pipelineResult;
}

// ──────────────────────────────────────────────────────────────────
// 統計キャッシュ (オンデマンドの集計結果を保存し、N秒以内は再利用)
// TTL は env.STATS_CACHE_TTL_SECONDS で上書き可能 (デフォルト 300秒)
// ──────────────────────────────────────────────────────────────────
function getDefaultStatsCacheTtl(env: any): number {
  const raw = env?.STATS_CACHE_TTL_SECONDS;
  if (!raw) return 300;
  const n = parseInt(String(raw), 10);
  if (isNaN(n) || n <= 0) return 300;
  return Math.min(n, 86400); // 上限 1 日
}

async function ensureStatsCacheSchema(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS stats_cache (
      cache_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ttl_seconds INTEGER NOT NULL DEFAULT 300
    )
  `).run().catch(() => {});
}

async function getCachedStats(db: D1Database, cacheKey: string): Promise<any | null> {
  await ensureStatsCacheSchema(db);
  try {
    const row = await db.prepare(`SELECT payload, computed_at, ttl_seconds FROM stats_cache WHERE cache_key = ?`)
      .bind(cacheKey).first() as any;
    if (!row) return null;
    const computedAt = new Date(row.computed_at + (String(row.computed_at).endsWith("Z") ? "" : "Z")).getTime();
    const ageMs = Date.now() - computedAt;
    if (ageMs > Number(row.ttl_seconds || 300) * 1000) return null;
    return JSON.parse(row.payload);
  } catch {
    return null;
  }
}

async function setCachedStats(db: D1Database, cacheKey: string, payload: any, ttlSeconds: number = 300): Promise<void> {
  await ensureStatsCacheSchema(db);
  await db.prepare(`
    INSERT INTO stats_cache (cache_key, payload, computed_at, ttl_seconds)
    VALUES (?, ?, CURRENT_TIMESTAMP, ?)
    ON CONFLICT(cache_key) DO UPDATE SET
      payload = excluded.payload,
      computed_at = CURRENT_TIMESTAMP,
      ttl_seconds = excluded.ttl_seconds
  `).bind(cacheKey, JSON.stringify(payload), ttlSeconds).run().catch(() => {});
}

dataRouter.post("/journals", requireRoles(["student"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const body = await c.req.json();
    const user = (c.get("user" as any) as any) as any;
    const studentId = (user as any).id; // Override with user id to prevent spoofing
    
    const id = body.id || crypto.randomUUID();
    const content = body.content || "";
    const status = body.status || "draft";

    // Phase 7-2: week_number は 1..52 の整数のみ許可。
    // 省略時は 1 (デフォルト) を採用 (従来挙動を維持)。
    const weekNumberRaw = body.week_number ?? 1;
    const validated = requireWeekNumber(c, weekNumberRaw);
    if (validated instanceof Response) return validated;
    const weekNumber = validated;
    const studentName = (user as any).name || "学生";
    await ensureSchema(db);

    // status カラム も保存
    const result = await db.prepare(`
      INSERT INTO journal_entries (id, student_id, entry_date, week_number, content, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, studentId, body.entry_date || new Date().toISOString(), weekNumber, content, status).run();

    setAuditWriteContext(c, {
      resourceType: 'journal',
      resourceId: id,
      targetStudentId: studentId,
      entityOwnerUserId: studentId,
      action: 'create',
      scopeBasis: 'self',
      changedFields: ['created'],
      afterState: { id, student_id: studentId, week_number: weekNumber, status },
      changeSummary: { operation: 'create', status }
    });

    // 自動連動パイプライン (共通関数を使用)
    const triggered = status === "submitted" && content.length > 30;
    let pipelineResult: any = { evaluation_saved: false, scat_saved: false };
    if (triggered) {
      const apiKey = (c.env as any)?.OPENAI_API_KEY;
      pipelineResult = await runJournalAutoPipeline(db, apiKey, {
        journalId: id, studentId, studentName, weekNumber, content,
      }, c.env);
    }

    return c.json({
      success: result.success,
      id,
      auto_pipeline_triggered: triggered,
      pipeline: pipelineResult
    });
  } catch (err) {
    const msg = String(err);
    // UNIQUE 制約違反 (同一学生・同一日付の重複作成) はクライアント側に分かりやすく
    if (msg.includes("UNIQUE constraint failed") && msg.includes("entry_date")) {
      return c.json({
        success: false,
        error: "duplicate_entry_date",
        message: "同じ日付の日誌が既に存在します。既存の日誌を編集してください。",
      }, 409);
    }
    return c.json({ error: msg }, 500);
  }
});

dataRouter.get("/journals/:id", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const journalId = c.req.param("id");

  try {
    // 学生名も同時取得し、教員・指導教員が「誰の日誌か」を一目で識別できるようにする
    const { results } = await db.prepare(`
      SELECT j.*, u.name as student_name
      FROM journal_entries j
      LEFT JOIN users u ON u.id = j.student_id
      WHERE j.id = ?
    `).bind(journalId).all();
    if (!results || results.length === 0) {
      return c.json({ success: false, error: "見つかりません" }, 404);
    }
    
    const journal = results[0] as any;
    const scope = await getScopeContext(c, db);
    if (!assertCanAccessStudent(scope, journal.student_id)) {
      setAuditReadContext(c, {
        resourceType: 'journal',
        resourceId: journal.id,
        targetStudentId: journal.student_id,
        reason: 'scope_violation'
      });
      return c.json({ success: false, error: "forbidden", message: "この日誌にアクセスする権限がありません。" }, 403);
    }
    
    setAuditReadContext(c, {
      resourceType: 'journal',
      resourceId: journal.id,
      targetStudentId: journal.student_id,
      visibleRecordCount: 1,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });
    return c.json({ success: true, journal });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.post("/evaluations", requireRoles(["student", "evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as any;

  // 入力バリデーション
  if (!body || typeof body !== "object") {
    return c.json({ error: "リクエスト本文が不正です" }, 400);
  }
  if (!body.journal_id || typeof body.journal_id !== "string") {
    return c.json({ error: "journal_id は必須の文字列です" }, 400);
  }
  if (!body.evaluation || typeof body.evaluation !== "object") {
    return c.json({ error: "evaluation オブジェクトは必須です" }, 400);
  }
  if (!Array.isArray(body.evaluation.items) || body.evaluation.items.length === 0) {
    return c.json({ error: "evaluation.items は1件以上の配列が必要です" }, 400);
  }

  try {
    const fa = computeFactorAverages(body.evaluation.items);
    const computedTotal = fa.total;
    const evalId = genId();
    
    await db.prepare(`
      INSERT INTO evaluations (id, journal_id, eval_type, model_name, prompt_version, temperature,
        total_score, factor1_score, factor2_score, factor3_score, factor4_score, factor5_score, factor6_score,
        overall_comment, reasoning, halo_effect_detected, token_count, duration_ms, created_at)
      VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      evalId, body.journal_id,
      body.model_name ?? "gpt-4o",
      body.prompt_version ?? "CoT-A-v1.0",
      body.temperature ?? 0.2,
      computedTotal,
      fa.f1, fa.f2, fa.f3, fa.f4, fa.f5, fa.f6,
      body.evaluation.overall_comment,
      body.evaluation.reasoning,
      body.evaluation.halo_effect_detected ? 1 : 0,
      body.token_count ?? null,
      body.duration_ms ?? null,
      new Date().toISOString()
    ).run();

    // 全項目を保存（6因子40項目）
    for (const item of body.evaluation.items) {
      const rdLevel = (item.rd_level as string | undefined) || scoreToRdLevel(item.score);
      await db.prepare(`
        INSERT INTO evaluation_items (id, evaluation_id, item_number, score, rd_level, is_na, evidence, feedback, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        genId(), evalId, item.item_number,
        item.score ?? null,
        rdLevel,
        item.is_na ? 1 : 0,
        item.evidence ?? null,
        item.feedback ?? null,
        new Date().toISOString()
      ).run();
    }

    // Update journal status to evaluated if complete
    const isComplete = body.evaluation && body.evaluation.items && body.evaluation.items.length >= 23;
    if (isComplete) {
      await db.prepare("UPDATE journal_entries SET status = 'evaluated' WHERE id = ?").bind(body.journal_id).run();
    } else {
      // It remains submitted or whatever it was
      await db.prepare("UPDATE journal_entries SET status = 'submitted' WHERE id = ? AND status = 'evaluated'").bind(body.journal_id).run();
    }

    return c.json({ success: true, evaluation_id: evalId });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/evaluations", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const studentId = c.req.query("student_id");
  const journalId = c.req.query("journal_id");

  try {
    const scope = await getScopeContext(c, db);
    const { condition, params } = buildScopeFilter(scope, "student_id");
    
    let query;
    if (journalId) {
      // Need to join journal to get student_id or assume evaluation has it
      query = db.prepare(`SELECT e.*, j.student_id FROM evaluations e JOIN journal_entries j ON e.journal_id = j.id WHERE e.journal_id = ? AND ${condition.replace(/student_id/g, 'j.student_id')} ORDER BY e.created_at DESC`).bind(journalId, ...params);
    } else if (studentId) {
      if (!assertCanAccessStudent(scope, studentId)) {
        setAuditReadContext(c, {
          resourceType: 'evaluation',
          targetStudentId: studentId,
          reason: 'scope_violation'
        });
        return c.json({ success: false, error: "forbidden" }, 403);
      }
      query = db.prepare("SELECT e.*, j.student_id FROM evaluations e JOIN journal_entries j ON e.journal_id = j.id WHERE j.student_id = ? ORDER BY e.created_at DESC").bind(studentId);
    } else {
      query = db.prepare(`SELECT e.*, j.student_id FROM evaluations e JOIN journal_entries j ON e.journal_id = j.id WHERE ${condition.replace(/student_id/g, 'j.student_id')} ORDER BY e.created_at DESC`).bind(...params);
    }

    const { results } = await query.all();
    
    const distinctStudentIds = Array.from(new Set(results.map((r: any) => r.student_id).filter(Boolean)));
    setAuditReadContext(c, {
      resourceType: 'evaluation',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    const role = ((c.get("user" as any) as any) as any)?.role;
    const anonLevel = scope.anonymizationLevel;
    let finalResults = results;
    if (anonLevel && role !== "admin") {
      finalResults = applyAnonymization(results, { role, anonymizationLevel: anonLevel, resourceType: "evaluation" });
    }

    return c.json({ success: true, evaluations: finalResults });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/evaluations/:journalId", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const eval_ = await db.prepare(
      "SELECT * FROM evaluations WHERE journal_id = ? ORDER BY created_at DESC LIMIT 1"
    ).bind(c.req.param("journalId")).first();

    if (!eval_) return c.json({ error: "見つかりません" }, 404);

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
dataRouter.post("/human-evals", requireRoles(["evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as {
    journal_id: string;
    evaluator_id: string;
    evaluator_name: string;
    items: Array<{ item_number: number; score: number; is_na?: boolean; comment?: string }>;
  };

  // 入力バリデーション
  if (!body || typeof body !== "object") {
    return c.json({ error: "リクエスト本文が不正です" }, 400);
  }
  if (!body.journal_id || typeof body.journal_id !== "string") {
    return c.json({ error: "journal_id は必須の文字列です" }, 400);
  }
  if (!body.evaluator_id || typeof body.evaluator_id !== "string") {
    return c.json({ error: "evaluator_id は必須の文字列です" }, 400);
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "items は1件以上の配列が必要です" }, 400);
  }

  try {
    const fa = computeFactorAverages(body.items);

    // 既存の同一評価者のデータがあれば削除（アイテムも含む）
    const oldEvals = await db.prepare("SELECT id FROM human_evaluations WHERE journal_id = ? AND evaluator_id = ?").bind(body.journal_id, body.evaluator_id).all();
    if (oldEvals.results && oldEvals.results.length > 0) {
      for (const old of oldEvals.results) {
        await db.prepare("DELETE FROM human_eval_items WHERE human_eval_id = ?").bind(old.id as string).run();
      }
      await db.prepare("DELETE FROM human_evaluations WHERE journal_id = ? AND evaluator_id = ?").bind(body.journal_id, body.evaluator_id).run();
    }

    const id = genId();
    await db.prepare(`
      INSERT INTO human_evaluations (id, journal_id, evaluator_id, evaluator_name,
        total_score, factor1_score, factor2_score, factor3_score, factor4_score, factor5_score, factor6_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.journal_id, body.evaluator_id, body.evaluator_name,
      fa.total, fa.f1, fa.f2, fa.f3, fa.f4, fa.f5, fa.f6,
      nowISO()
    ).run();

    for (const item of body.items) {
      await db.prepare(`
        INSERT INTO human_eval_items (id, human_eval_id, item_number, score, is_na, comment)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(genId(), id, item.item_number, item.score ?? null, item.is_na ? 1 : 0, item.comment ?? null).run();
    }

    setAuditWriteContext(c, {
      resourceType: 'human_evaluation',
      resourceId: id,
      action: 'create',
      scopeBasis: 'assigned',
      changedFields: ['created'],
      changeSummary: { operation: 'create' }
    });
    return c.json({ success: true, human_eval_id: id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/human-evals", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const evals = await db.prepare("SELECT * FROM human_evaluations ORDER BY created_at DESC").all();
    return c.json({ success: true, evaluations: evals.results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/human-evals/:journalId", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const journalId = c.req.param("journalId");
  
  try {
    const evalsResult = await db.prepare(
      `SELECT * FROM human_evaluations WHERE journal_id = ? ORDER BY created_at DESC`
    ).bind(journalId).all();
    
    const evals = evalsResult.results || [];
    
    // itemsを取得
    for (const ev of evals) {
      const itemsResult = await db.prepare(
        `SELECT * FROM human_eval_items WHERE human_eval_id = ? ORDER BY item_number ASC`
      ).bind(ev.id).all();
      ev.items = itemsResult.results || [];
    }
    
    return c.json({ evaluations: evals });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// 自己評価（週次）
// ────────────────────────────────────────────────────────────────
dataRouter.post("/self-evals", requireRoles(["student"] as UserRole[]), async (c) => {
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
    factor5_score?: number;
    factor6_score?: number;
    rd_journal_level?: number;
    comment?: string;
  };

  // Phase 7-2: week_number は 1..52 の整数のみ許可
  const validatedWeek = requireWeekNumber(c, body.week_number);
  if (validatedWeek instanceof Response) return validatedWeek;

  try {
    // 6因子40項目 加重平均（各因子項目数 [11,8,5,7,5,4] / 40）
    const f5 = body.factor5_score ?? 0;
    const f6 = body.factor6_score ?? 0;
    const total = (
      body.factor1_score * 11 + body.factor2_score * 8 + body.factor3_score * 5 +
      body.factor4_score * 7 + f5 * 5 + f6 * 4
    ) / 40;
    const id = genId();

    await db.prepare(`
      INSERT OR REPLACE INTO self_evaluations
        (id, student_id, week_number, journal_id, factor1_score, factor2_score, factor3_score, factor4_score,
         factor5_score, factor6_score, total_score, rd_journal_level, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.student_id, validatedWeek, body.journal_id ?? null,
      body.factor1_score, body.factor2_score, body.factor3_score, body.factor4_score,
      f5, f6,
      Math.round(total * 100) / 100,
      body.rd_journal_level ?? null, body.comment ?? null, nowISO()
    ).run();

    return c.json({ success: true, self_eval_id: id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.get("/growth/:studentId", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const studentId = c.req.param("studentId");

  try {
    // AI 評価 (週次平均)
    const { results: aiRows } = await db.prepare(`
      SELECT 
        j.week_number,
        AVG(e.factor1_score) as factor1,
        AVG(e.factor2_score) as factor2,
        AVG(e.factor3_score) as factor3,
        AVG(e.factor4_score) as factor4,
        AVG(e.factor5_score) as factor5,
        AVG(e.factor6_score) as factor6,
        AVG(e.total_score) as ai_total,
        MAX(j.id) as journal_id
      FROM journal_entries j
      JOIN evaluations e ON j.id = e.journal_id
      WHERE j.student_id = ? AND e.eval_type = 'ai'
      GROUP BY j.week_number
      ORDER BY j.week_number ASC
    `).bind(studentId).all();

    // 自己評価 (週次平均)
    const { results: selfRows } = await db.prepare(`
      SELECT 
        week_number,
        AVG(factor1_score) as self_f1,
        AVG(factor2_score) as self_f2,
        AVG(factor3_score) as self_f3,
        AVG(factor4_score) as self_f4,
        AVG(factor5_score) as self_f5,
        AVG(factor6_score) as self_f6,
        AVG(total_score) as self_total
      FROM self_evaluations
      WHERE student_id = ?
      GROUP BY week_number
    `).bind(studentId).all().catch(() => ({ results: [] as any[] }));

    // self を week -> row のマップに
    const selfMap = new Map<number, any>();
    for (const r of selfRows as any[]) {
      selfMap.set(Number(r.week_number), r);
    }

    return c.json({
      success: true,
      student_id: studentId,
      weekly_scores: (aiRows as any[]).map((row) => {
        const wk = Number(row.week_number);
        const self = selfMap.get(wk);
        return {
          week_number: wk,
          factor1: row.factor1 || 0,
          factor2: row.factor2 || 0,
          factor3: row.factor3 || 0,
          factor4: row.factor4 || 0,
          factor5: row.factor5 || 0,
          factor6: row.factor6 || 0,
          total: row.ai_total || 0,    // 互換: total = AI 評価 (歴史的キー)
          ai_total: row.ai_total || 0,
          self_total: self ? (self.self_total || 0) : null,
          self_factor1: self ? (self.self_f1 || 0) : null,
          self_factor2: self ? (self.self_f2 || 0) : null,
          self_factor3: self ? (self.self_f3 || 0) : null,
          self_factor4: self ? (self.self_f4 || 0) : null,
          self_factor5: self ? (self.self_f5 || 0) : null,
          self_factor6: self ? (self.self_f6 || 0) : null,
          gap: self && row.ai_total ? Math.round(((row.ai_total - (self.self_total || 0)) * 100)) / 100 : null,
          journal_id: row.journal_id || ""
        };
      })
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/self-evals/:studentId", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
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
dataRouter.post("/goals", requireRoles(["student"] as UserRole[]), async (c) => {
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
    difficulty_level?: string;
    adjustment_reason?: string;
    bfi_context?: any;
  };

  // Phase 7-2: week_number は 1..52 の整数のみ許可
  const validatedWeek = requireWeekNumber(c, body.week_number);
  if (validatedWeek instanceof Response) return validatedWeek;

  try {
    const id = genId();
    const sc = body.smart_criteria ?? {};

    await db.prepare(`
      INSERT INTO goals (id, student_id, session_id, week_number, goal_text, target_item_id, target_factor,
        is_smart, smart_specific, smart_measurable, smart_achievable, smart_relevant, smart_time_bound, difficulty_level, adjustment_reason, bfi_context, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, body.student_id, body.session_id ?? null, validatedWeek, body.goal_text,
      body.target_item_id ?? null, body.target_factor ?? null,
      body.is_smart ? 1 : 0,
      sc.specific ? 1 : 0, sc.measurable ? 1 : 0, sc.achievable ? 1 : 0,
      sc.relevant ? 1 : 0, sc.time_bound ? 1 : 0,
      body.difficulty_level ?? null, body.adjustment_reason ?? null,
      body.bfi_context ? JSON.stringify(body.bfi_context) : null,
      nowISO()
    ).run();

    return c.json({ success: true, goal_id: id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/goals/:studentId", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
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
dataRouter.post("/icc-results", requireRoles(["researcher", "admin", "collaborator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "リクエスト本文が不正です (JSON parse error)" }, 400);
  }
  if (!body || typeof body !== "object") {
    return c.json({ error: "リクエスト本文が不正です" }, 400);
  }
  if (!body.scope || typeof body.scope !== "string") {
    return c.json({ error: "scope は必須の文字列です" }, 400);
  }
  if (typeof body.icc_value !== "number" || Number.isNaN(body.icc_value)) {
    return c.json({ error: "icc_value は必須の数値です" }, 400);
  }

  try {
    await db.prepare(`
      INSERT INTO icc_results (id, run_id, scope, factor, icc_value, ci_lower, ci_upper, f_value, df1, df2,
        p_value, interpretation, rater_count, subject_count, krippendorff_alpha, pearson_r, pearson_p, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      genId(), body.run_id ?? null, body.scope, body.factor ?? "total",
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
dataRouter.get("/students", requireRoles(["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const scope = await getScopeContext(c, db);
    const { condition, params } = buildScopeFilter(scope, "id");
    
    const { results } = await db.prepare(`SELECT * FROM users WHERE role = 'student' AND ${condition} ORDER BY created_at DESC`).bind(...params).all();
    
    const distinctStudentIds = results.map((r: any) => r.id);
    setAuditReadContext(c, {
      resourceType: 'student',
      targetStudentIds: distinctStudentIds as string[],
      visibleRecordCount: results.length,
      scopeBasis: scope.allowedStudentIds === "ALL" ? "all" : "assigned"
    });

    const role = ((c.get("user" as any) as any) as any)?.role;
    const anonLevel = scope.anonymizationLevel;
    let finalResults = results;
    if (anonLevel && role !== "admin") {
      finalResults = applyAnonymization(results, { role, anonymizationLevel: anonLevel, resourceType: "student" });
    }

    return c.json({ success: true, students: finalResults });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// TEACHERダッシュボード用 コーホートプロファイル一覧
// GET /api/data/teacher/profiles
// ────────────────────────────────────────────────────────────────
dataRouter.get("/teacher/profiles", requireRoles(["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const scope = await getScopeContext(c, db);
    const { condition, params } = buildScopeFilter(scope, "u.id");

    // 学生一覧＋週次スコア集計を一括取得
    const studentsResult = await db.prepare(`
      SELECT u.id, u.name, u.grade, u.student_number
      FROM users u
      WHERE u.role = 'student' AND ${condition}
      ORDER BY u.name ASC
    `).bind(...params).all();

    const students = studentsResult.results as any[];

    // 各学生の週次スコアを取得
    const profiles = await Promise.all(students.map(async (s: any) => {
      const scoresResult = await db.prepare(`
        SELECT week_number, factor1_score, factor2_score, factor3_score, factor4_score, factor5_score, factor6_score, total_score
        FROM learning_progress_scores
        WHERE student_id = ?
        ORDER BY week_number ASC
      `).bind(s.id).all();
      const scores = scoresResult.results as any[];

      // フロントは weekly_scores を { week, factor1..factor6, total } の
      // オブジェクト配列として扱う (LongitudinalAnalysisPage / StatisticsPage 等)。
      const weeklyScores = scores.map((r: any) => ({
        week: r.week_number,
        factor1: r.factor1_score,
        factor2: r.factor2_score,
        factor3: r.factor3_score,
        factor4: r.factor4_score,
        factor5: r.factor5_score,
        factor6: r.factor6_score,
        total: r.total_score,
      }));
      const lastScore = scores.length > 0 ? scores[scores.length - 1] : null;
      const firstScore = scores.length > 0 ? scores[0] : null;
      const finalTotal = lastScore ? lastScore.total_score : 0;
      const finalFactor1 = lastScore ? lastScore.factor1_score : 0;
      const finalFactor2 = lastScore ? lastScore.factor2_score : 0;
      const finalFactor3 = lastScore ? lastScore.factor3_score : 0;
      const finalFactor4 = lastScore ? lastScore.factor4_score : 0;
      const finalFactor5 = lastScore ? lastScore.factor5_score : 0;
      const finalFactor6 = lastScore ? lastScore.factor6_score : 0;
      const growthDelta = (lastScore && firstScore)
        ? parseFloat((lastScore.total_score - firstScore.total_score).toFixed(2))
        : 0;

      // 日誌数（実習週数として使用）
      const journalResult = await db.prepare(`
        SELECT COUNT(*) as cnt FROM journal_entries WHERE student_id = ?
      `).bind(s.id).first() as any;
      const weeks = journalResult?.cnt || 0;

      return {
        id: s.id,
        name: s.name || "—",
        grade: s.grade || 3,
        student_number: s.student_number || "",
        school_name: "〇〇大学",
        gender: "unknown",
        school_type: ((Number(String(s.id).match(/(\d+)$/)?.[1]) || 0) % 4 === 0) ? "special"
                    : ((Number(String(s.id).match(/(\d+)$/)?.[1]) || 0) % 4 === 1) ? "elementary"
                    : ((Number(String(s.id).match(/(\d+)$/)?.[1]) || 0) % 4 === 2) ? "middle"
                    : "high",
        internship_type: "intensive",
        weeks: Math.max(weeks, weeklyScores.length),
        weekly_scores: weeklyScores,
        final_total: finalTotal,
        final_factor1: finalFactor1,
        final_factor2: finalFactor2,
        final_factor3: finalFactor3,
        final_factor4: finalFactor4,
        final_factor5: finalFactor5,
        final_factor6: finalFactor6,
        growth_delta: growthDelta,
      };
    }));

    return c.json({ success: true, cohorts: profiles });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// /api/data/cohorts エイリアス
// StatisticsPage / LongitudinalAnalysisPage 等が直接 /api/data/cohorts を
// 呼んでいるため、/teacher/profiles と同じレスポンス形式で返すエイリアス
// を提供する (これがないと SPA fallback で HTML が返り useQuery が永久に
// isLoading のままになり、画面が真っ白になる)。
// ────────────────────────────────────────────────────────────────
dataRouter.get("/cohorts", requireRoles(["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const scope = await getScopeContext(c, db);
    const { condition, params } = buildScopeFilter(scope, "u.id");

    const studentsResult = await db.prepare(`
      SELECT u.id, u.name, u.grade, u.student_number
      FROM users u
      WHERE u.role = 'student' AND ${condition}
      ORDER BY u.name ASC
    `).bind(...params).all();

    const students = studentsResult.results as any[];

    const profiles = await Promise.all(students.map(async (s: any) => {
      const scoresResult = await db.prepare(`
        SELECT week_number, factor1_score, factor2_score, factor3_score, factor4_score, factor5_score, factor6_score, total_score
        FROM learning_progress_scores
        WHERE student_id = ?
        ORDER BY week_number ASC
      `).bind(s.id).all();
      const scores = scoresResult.results as any[];

      const weeklyScores = scores.map((r: any) => ({
        week: r.week_number,
        factor1: r.factor1_score,
        factor2: r.factor2_score,
        factor3: r.factor3_score,
        factor4: r.factor4_score,
        factor5: r.factor5_score,
        factor6: r.factor6_score,
        total: r.total_score,
      }));
      const lastScore = scores.length > 0 ? scores[scores.length - 1] : null;
      const firstScore = scores.length > 0 ? scores[0] : null;
      const finalTotal = lastScore ? lastScore.total_score : 0;
      const growthDelta = (lastScore && firstScore)
        ? parseFloat((lastScore.total_score - firstScore.total_score).toFixed(2))
        : 0;

      const journalResult = await db.prepare(`
        SELECT COUNT(*) as cnt FROM journal_entries WHERE student_id = ?
      `).bind(s.id).first() as any;
      const weeks = journalResult?.cnt || 0;

      return {
        id: s.id,
        name: s.name || "—",
        grade: s.grade || 3,
        student_number: s.student_number || "",
        school_name: "〇〇大学",
        gender: "unknown",
        school_type: ((Number(String(s.id).match(/(\d+)$/)?.[1]) || 0) % 4 === 0) ? "special"
                    : ((Number(String(s.id).match(/(\d+)$/)?.[1]) || 0) % 4 === 1) ? "elementary"
                    : ((Number(String(s.id).match(/(\d+)$/)?.[1]) || 0) % 4 === 2) ? "middle"
                    : "high",
        internship_type: "intensive",
        weeks: Math.max(weeks, weeklyScores.length),
        weekly_scores: weeklyScores,
        final_total: finalTotal,
        final_factor1: lastScore ? lastScore.factor1_score : 0,
        final_factor2: lastScore ? lastScore.factor2_score : 0,
        final_factor3: lastScore ? lastScore.factor3_score : 0,
        final_factor4: lastScore ? lastScore.factor4_score : 0,
        final_factor5: lastScore ? lastScore.factor5_score : 0,
        final_factor6: lastScore ? lastScore.factor6_score : 0,
        growth_delta: growthDelta,
      };
    }));

    return c.json({ success: true, cohorts: profiles });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// 保存済み信頼性分析結果の一覧取得
// ────────────────────────────────────────────────────────────────
dataRouter.get("/reliability-results", requireRoles(["researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const query = `
      SELECT 
        i.calculated_at,
        i.run_id,
        i.scope AS data_source,
        i.subject_count AS paired_count,
        i.icc_value AS overall_icc,
        b.mean_diff AS overall_mean_diff
      FROM icc_results i
      LEFT JOIN bland_altman_results b 
        ON (i.run_id = b.run_id OR (i.run_id IS NULL AND b.run_id IS NULL AND datetime(i.calculated_at) = datetime(b.calculated_at))) 
        AND i.factor = b.factor
      WHERE i.factor = 'total' OR i.factor IS NULL
      GROUP BY i.run_id
      ORDER BY i.calculated_at DESC
    `;
    const results = await db.prepare(query).all();
    return c.json({ success: true, results: results.results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// 保存済み信頼性分析結果の詳細取得 (run_id)
// ────────────────────────────────────────────────────────────────
dataRouter.get("/reliability-results/:runId", requireRoles(["researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  const runId = c.req.param("runId");
  try {
    const query = `
      SELECT 
        i.factor,
        i.icc_value,
        i.ci_lower AS icc_ci_lower,
        i.ci_upper AS icc_ci_upper,
        b.mean_diff,
        b.loa_lower,
        b.loa_upper,
        i.subject_count,
        i.calculated_at,
        i.scope AS data_source,
        i.run_id
      FROM icc_results i
      LEFT JOIN bland_altman_results b 
        ON i.run_id = b.run_id AND i.factor = b.factor
      WHERE i.run_id = ?
      ORDER BY 
        CASE i.factor 
          WHEN 'total' THEN 0 
          WHEN 'factor1' THEN 1 
          WHEN 'factor2' THEN 2 
          WHEN 'factor3' THEN 3 
          WHEN 'factor4' THEN 4 
          ELSE 5 
        END
    `;
    const results = await db.prepare(query).bind(runId).all();
    return c.json({ success: true, details: results.results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.get("/export/evaluations-csv", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {

  

  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const { results } = await db.prepare(`
      SELECT
        je.student_id, je.week_number, je.entry_date,
        e.total_score, e.factor1_score, e.factor2_score, e.factor3_score, e.factor4_score, e.factor5_score, e.factor6_score,
        e.halo_effect_detected, e.overall_comment, e.model_name
      FROM evaluations e
      JOIN journal_entries je ON e.journal_id = je.id
      WHERE e.eval_type = 'ai'
      ORDER BY je.student_id, je.week_number
    `).all();

    const headers = [
      "student_id", "week_number", "entry_date",
      "total_score", "factor1_score", "factor2_score", "factor3_score", "factor4_score", "factor5_score", "factor6_score",
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

dataRouter.get("/export/reliability-csv", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {

  

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

// ────────────────────────────────────────────────────────────────
// GET /api/data/rubric-behaviors
// 全40項目×5段階のRD水準行動指標を返す（または初期投入）
// 2026-03-07: 全因子共通RD水準対応
// ────────────────────────────────────────────────────────────────
dataRouter.get("/rubric-behaviors", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 500);

  try {
    const { results } = await db.prepare(
      "SELECT * FROM rubric_item_behaviors ORDER BY item_number, score DESC"
    ).all();
    return c.json({ behaviors: results, total: results.length });
  } catch {
    return c.json({ behaviors: [], total: 0 });
  }
});

// ────────────────────────────────────────────────────────────────
// GET /api/data/stats-cache/config
// 現在のキャッシュ TTL 設定を返す (admin/researcher 用)
// ────────────────────────────────────────────────────────────────
dataRouter.get("/stats-cache/config", requireRoles(["admin", "researcher"] as UserRole[]), async (c) => {
  const ttl = getDefaultStatsCacheTtl(c.env);
  return c.json({
    default_ttl_seconds: ttl,
    source: (c.env as any)?.STATS_CACHE_TTL_SECONDS ? "env(STATS_CACHE_TTL_SECONDS)" : "default(300)",
    max_allowed: 86400,
  });
});

// POST /api/data/evaluation-items/backfill-rd-level
// 既存の evaluation_items.rd_level が NULL のレコードを score から自動算出して更新
// ────────────────────────────────────────────────────────────────
dataRouter.post("/evaluation-items/backfill-rd-level", requireRoles(["admin", "researcher"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 500);
  try {
    const { results } = await db.prepare(
      "SELECT id, score FROM evaluation_items WHERE rd_level IS NULL AND score IS NOT NULL"
    ).all();
    let updated = 0;
    for (const row of results || []) {
      const r = row as any;
      const rd = scoreToRdLevel(r.score);
      if (!rd) continue;
      await db.prepare("UPDATE evaluation_items SET rd_level = ? WHERE id = ?").bind(rd, r.id).run();
      updated++;
    }
    return c.json({ success: true, total_null: results?.length || 0, updated });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// POST /api/data/rubric-behaviors/seed
// 全40項目×5段階のRD水準行動指標をDBに投入（初期化）
// ────────────────────────────────────────────────────────────────
dataRouter.post("/rubric-behaviors/seed", requireRoles(["admin", "researcher"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 500);

  // 全6因子・全40項目×5段階のRD行動指標データ（rubric.ts と完全同期）
  // 6因子40項目×5段階のRD行動指標を rubric.ts（単一の真実の源）から投入
  let insertedCount = 0;
  let totalCount = 0;
  for (const item of RUBRIC_ITEMS) {
    const factorKey = getFactorKeyByItemNum(item.num);
    for (const b of item.behaviors) {
      totalCount++;
      const id = `beh-${item.num}-${b.score}`;
      try {
        await db.prepare(`
          INSERT OR REPLACE INTO rubric_item_behaviors
            (id, item_number, factor, item_label, item_text, lambda, score, rd_level, indicator)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id, item.num, factorKey, item.label,
          item.text, item.lambda, b.score, b.rd, b.indicator
        ).run();
        insertedCount++;
      } catch (e) {
        console.warn(`Skip item ${item.num} score ${b.score}:`, e);
      }
    }
  }

  return c.json({ success: true, inserted: insertedCount, total: totalCount });
});

// ────────────────────────────────────────────────────────────────
// GET /api/data/rubric-behaviors/:itemNumber
// 特定項目のRD水準行動指標を返す
// ────────────────────────────────────────────────────────────────
dataRouter.get("/rubric-behaviors/:itemNumber", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 500);

  const itemNum = parseInt(c.req.param("itemNumber") || "");
  if (isNaN(itemNum) || itemNum < 1 || itemNum > 40) {
    return c.json({ error: "Invalid item number (1-40)" }, 400);
  }

  try {
    const { results } = await db.prepare(
      "SELECT * FROM rubric_item_behaviors WHERE item_number = ? ORDER BY score DESC"
    ).bind(itemNum).all();
    return c.json({ item_number: itemNum, behaviors: results });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});


// POST /api/data/rq3b/save
dataRouter.post("/rq3b/save", requireRoles(["student"] as UserRole[]), async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '認証されていません' }, 401);
  }
  let authContext;
  try {
    const token = authHeader.split(' ')[1];
    authContext = JSON.parse(atob(token));
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  if (authContext.role !== 'student') {
    return c.json({ error: 'アクセス権限がありません' }, 403);
  }
  
  const body = await c.req.json();
  const userId = body.userId;
  
  if (userId !== authContext.id) {
    return c.json({ error: 'Forbidden: Cannot update other users data' }, 403);
  }
  
  const db = c.env.DB as D1Database;
  const updates = Array.isArray(body.updates) ? body.updates : [body];
  
  try {
    const stmts = updates.map((upd: any) => {
      const { week_number, goal_id, focus_item_id, rd_chat_raw_level, rd_chat_category, previous_score, current_score, delta_score, ga_self_rating, ga_self_binary, ga_evidence_binary, ga_evidence_reason } = upd;
      
      // Default dummy values for composite keys if missing
      const g_id = goal_id || 'no_goal';
      const f_id = focus_item_id || 0;
      const id = `${userId}_wk${week_number}_g${g_id}_f${f_id}`;
      
      return db.prepare(`
        INSERT INTO rq3b_outcomes (
          id, user_id, week_number, goal_id, focus_item_id,
          rd_chat_raw_level, rd_chat_category,
          previous_score, current_score, delta_score,
          ga_self_rating, ga_self_binary,
          ga_evidence_binary, ga_evidence_reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, week_number, goal_id, focus_item_id) DO UPDATE SET
          rd_chat_raw_level = COALESCE(excluded.rd_chat_raw_level, rq3b_outcomes.rd_chat_raw_level),
          rd_chat_category = COALESCE(excluded.rd_chat_category, rq3b_outcomes.rd_chat_category),
          previous_score = COALESCE(excluded.previous_score, rq3b_outcomes.previous_score),
          current_score = COALESCE(excluded.current_score, rq3b_outcomes.current_score),
          delta_score = COALESCE(excluded.delta_score, rq3b_outcomes.delta_score),
          ga_self_rating = COALESCE(excluded.ga_self_rating, rq3b_outcomes.ga_self_rating),
          ga_self_binary = COALESCE(excluded.ga_self_binary, rq3b_outcomes.ga_self_binary),
          ga_evidence_binary = COALESCE(excluded.ga_evidence_binary, rq3b_outcomes.ga_evidence_binary),
          ga_evidence_reason = COALESCE(excluded.ga_evidence_reason, rq3b_outcomes.ga_evidence_reason),
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        id, userId, week_number, g_id, f_id,
        rd_chat_raw_level || null, rd_chat_category || null,
        previous_score || null, current_score || null, delta_score || null,
        ga_self_rating || null, ga_self_binary !== undefined ? ga_self_binary : null,
        ga_evidence_binary !== undefined ? ga_evidence_binary : null, ga_evidence_reason || null
      );
    });
    
    await db.batch(stmts);
    return c.json({ success: true });
  } catch (error) {
    console.error('RQ3b save error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/data/rq3b/responses/:userId
dataRouter.get("/rq3b/responses/:userId", requireRoles(["student", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const reqUserId = c.req.param('userId');
  
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: '認証されていません' }, 401);
  }
  let authContext;
  try {
    const token = authHeader.split(' ')[1];
    authContext = JSON.parse(atob(token));
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
  
  if (authContext.role === 'student' && authContext.id !== reqUserId) {
    return c.json({ error: 'アクセス権限がありません' }, 403);
  }
  
  const db = c.env.DB as D1Database;
  
  try {
    const { results } = await db.prepare('SELECT * FROM rq3b_outcomes WHERE user_id = ? ORDER BY week_number ASC').bind(reqUserId).all();
    return c.json({ success: true, data: results });
  } catch (error) {
    console.error('RQ3b fetch error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});


dataRouter.get("/export/joint-display-csv", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  

  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const { results } = await db.prepare(`
      SELECT
        sc.segment_id, sc.researcher_id,
        sc.step1_keywords, sc.step2_thesaurus, sc.step3_concept, sc.step4_theme, sc.memo, sc.factor,
        ss.text_content,
        je.student_id, je.week_number, je.id as journal_id,
        e.total_score as ai_total_score,
        e.factor1_score as ai_f1, e.factor2_score as ai_f2, e.factor3_score as ai_f3, e.factor4_score as ai_f4, e.factor5_score as ai_f5, e.factor6_score as ai_f6,
        se.total_score as self_total_score,
        se.factor1_score as self_f1, se.factor2_score as self_f2, se.factor3_score as self_f3, se.factor4_score as self_f4, se.factor5_score as self_f5, se.factor6_score as self_f6
      FROM scat_codes sc
      JOIN scat_segments ss ON sc.segment_id = ss.id
      LEFT JOIN journal_entries je ON ss.source_journal_id = je.id
      LEFT JOIN evaluations e ON je.id = e.journal_id
      LEFT JOIN self_evaluations se ON je.student_id = se.student_id AND je.week_number = se.week_number
      ORDER BY je.student_id, je.week_number, ss.segment_order
    `).all();

    if (!results || results.length === 0) return c.text("No data", 404);

    const headers = Object.keys(results[0]);
    const csv = [
      headers.join(","),
      ...results.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=joint_display.csv"
      }
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/export/chat-goals-csv", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  

  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const { results } = await db.prepare(`
      SELECT
        cm.session_id as chat_session_id, cm.role as message_role, cm.content as message_text, cm.created_at, cm.message_order, cm.phase, cm.reflection_depth,
        cs.student_id, cs.journal_id, cs.total_turns, cs.max_rd_chat_level,
        je.week_number,
        g.id as goal_id, g.goal_text, g.target_factor as goal_type, g.target_item_id as focus_item_id, g.achieved as achievement_status, g.created_at as goal_time
      FROM chat_messages cm
      JOIN chat_sessions cs ON cm.session_id = cs.id
      LEFT JOIN journal_entries je ON cs.journal_id = je.id
      LEFT JOIN goals g ON cs.id = g.session_id
      ORDER BY cs.student_id, je.week_number, cm.session_id, cm.message_order
    `).all();

    if (!results || results.length === 0) return c.text("No data", 404);

    const headers = Object.keys(results[0]);
    const csv = [
      headers.join(","),
      ...results.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=chat_goals.csv"
      }
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


// --- Evaluator Profiles ---
dataRouter.get("/evaluator-profiles", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  await ensureSchema(db);
  try {
    const { results } = await db.prepare("SELECT * FROM evaluator_profiles").all();
    return c.json({ success: true, profiles: results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.post("/evaluator-profiles", requireRoles(["evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  await ensureSchema(db);
  const body = await c.req.json();
  try {
    await db.prepare(`
      INSERT INTO evaluator_profiles (evaluator_id, years_of_experience, training_background)
      VALUES (?, ?, ?)
      ON CONFLICT(evaluator_id) DO UPDATE SET
        years_of_experience = excluded.years_of_experience,
        training_background = excluded.training_background
    `).bind(body.evaluator_id, body.years_of_experience || 0, body.training_background || "").run();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// --- Joint Display View ---
dataRouter.get("/joint-display", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  // Basic Auth Check
  

  await ensureSchema(db);
  try {
    const { results } = await db.prepare(`
      SELECT
        sc.segment_id, sc.researcher_id,
        sc.step1_keywords, sc.step2_thesaurus, sc.step3_concept, sc.step4_theme, sc.memo, sc.factor,
        ss.text_content,
        je.student_id, je.week_number, je.id as journal_id,
        e.total_score as ai_total_score,
        e.factor1_score as ai_f1, e.factor2_score as ai_f2, e.factor3_score as ai_f3, e.factor4_score as ai_f4, e.factor5_score as ai_f5, e.factor6_score as ai_f6,
        se.total_score as self_total_score,
        se.factor1_score as self_f1, se.factor2_score as self_f2, se.factor3_score as self_f3, se.factor4_score as self_f4, se.factor5_score as self_f5, se.factor6_score as self_f6
      FROM scat_codes sc
      JOIN scat_segments ss ON sc.segment_id = ss.id
      LEFT JOIN journal_entries je ON ss.source_journal_id = je.id
      LEFT JOIN evaluations e ON je.id = e.journal_id
      LEFT JOIN self_evaluations se ON je.student_id = se.student_id AND je.week_number = se.week_number
      ORDER BY je.student_id, je.week_number, ss.segment_order
    `).all();
    return c.json({ success: true, jointData: results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


// --- SCAT CRUD APIs ---
dataRouter.get("/scat/projects", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const { results } = await db.prepare("SELECT * FROM scat_projects ORDER BY created_at DESC").all();
    return c.json({ projects: results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.post("/scat/projects", requireRoles(["researcher", "admin", "collaborator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "リクエスト本文が不正です (JSON parse error)" }, 400);
  }
  if (!body || typeof body !== "object") {
    return c.json({ error: "リクエスト本文が不正です" }, 400);
  }
  if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
    return c.json({ error: "title は必須の非空文字列です" }, 400);
  }
  try {
    const { title, description, created_by } = body;
    const id = "proj_" + Date.now();
    await db.prepare("INSERT INTO scat_projects (id, title, description, created_by) VALUES (?, ?, ?, ?)").bind(id, title, description ?? null, created_by ?? null).run();
    // SCAT 連動: ISM/SP/伝達係数を dirty 化
    await markScatDependentsDirty(db).catch((e) => console.warn("markScatDependentsDirty failed:", e));
    return c.json({ success: true, id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.put("/scat/projects/:projectId/theorization", requireRoles(["researcher", "admin", "collaborator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const { storyline, theoretical_description } = await c.req.json();
    const projectId = c.req.param("projectId");
    
    // Attempt to add columns if they don't exist (SQLite doesn't support ADD COLUMN IF NOT EXISTS easily without PRAGMA, so we catch errors)
    try {
      await db.prepare("ALTER TABLE scat_projects ADD COLUMN storyline TEXT").run();
      await db.prepare("ALTER TABLE scat_projects ADD COLUMN theoretical_description TEXT").run();
    } catch(e) {} // Ignore if already exists

    await db.prepare("UPDATE scat_projects SET storyline = ?, theoretical_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(storyline || "", theoretical_description || "", projectId).run();
    // SCAT 連動: dirty 化
    await markScatDependentsDirty(db).catch((e) => console.warn("markScatDependentsDirty failed:", e));
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.get("/scat/segments/:projectId", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const { results } = await db.prepare("SELECT * FROM scat_segments WHERE project_id = ? ORDER BY created_at ASC").bind(c.req.param("projectId")).all();
    return c.json({ segments: results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.post("/scat/segments/:projectId", requireRoles(["researcher", "admin", "collaborator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "リクエスト本文が不正です (JSON parse error)" }, 400);
  }
  if (!body || typeof body !== "object") {
    return c.json({ error: "リクエスト本文が不正です" }, 400);
  }
  if (!Array.isArray(body.segments) || body.segments.length === 0) {
    return c.json({ error: "segments は1件以上の配列が必要です" }, 400);
  }
  try {
    const { segments } = body;
    const projectId = c.req.param("projectId");
    const stmt = db.prepare("INSERT INTO scat_segments (id, project_id, segment_order, text_content, source_journal_id) VALUES (?, ?, ?, ?, ?)");
    const batch = segments.map((s: any, idx: number) => stmt.bind(
      "seg_" + Math.random().toString(36).substr(2, 9),
      projectId,
      typeof s.segment_order === "number" ? s.segment_order : idx + 1,
      s.text_content,
      s.journal_id || s.source_journal_id || null
    ));
    if (batch.length > 0) {
      await db.batch(batch);
    }
    // SCAT 連動: dirty 化
    await markScatDependentsDirty(db).catch((e) => console.warn("markScatDependentsDirty failed:", e));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.get("/scat/codes/:projectId", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const { results } = await db.prepare("SELECT c.* FROM scat_codes c JOIN scat_segments s ON c.segment_id = s.id WHERE s.project_id = ?").bind(c.req.param("projectId")).all();
    return c.json({ codes: results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.post("/scat/codes", requireRoles(["researcher", "admin", "collaborator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "リクエスト本文が不正です (JSON parse error)" }, 400);
  }
  if (!body || typeof body !== "object") {
    return c.json({ error: "リクエスト本文が不正です" }, 400);
  }
  if (!body.segment_id || typeof body.segment_id !== "string") {
    return c.json({ error: "segment_id は必須の文字列です" }, 400);
  }
  try {
    const id = body.id || ("code_" + Date.now());
    await db.prepare(`
      INSERT INTO scat_codes (id, segment_id, researcher_id, step1_keywords, step2_thesaurus, step3_concept, step4_theme, memo, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        step1_keywords = excluded.step1_keywords,
        step2_thesaurus = excluded.step2_thesaurus,
        step3_concept = excluded.step3_concept,
        step4_theme = excluded.step4_theme,
        memo = excluded.memo,
        updated_at = CURRENT_TIMESTAMP
    `).bind(id, body.segment_id, body.researcher_id, body.step1_words || body.step1_keywords || "", body.step2_words || body.step2_thesaurus || "", body.step3_concepts || body.step3_concept || "", body.step4_themes || body.step4_theme || "", body.memo || "").run();
    // SCAT 連動: step4_theme 変更時は ISM/SP/伝達係数を dirty 化 (最重要トリガー)
    await markScatDependentsDirty(db).catch((e) => console.warn("markScatDependentsDirty failed:", e));
    return c.json({ success: true, id });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.put("/journals/:id", requireRoles(["student"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const id = c.req.param("id");
  const body = await c.req.json();
  
  try {
    const beforeState = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(id).first() as any;
    if (!beforeState) return c.json({ error: "見つかりません" }, 404);
    
    const scope = await getScopeContext(c, db);
    if (!assertCanAccessStudent(scope, beforeState.student_id)) {
      return c.json({ success: false, error: "forbidden", message: "データアクセス範囲外です。" }, 403);
    }

    // journal_entries に実在するカラムのみ UPDATE 対象とする (ホワイトリスト)。
    // クライアントは reflection_text / title など content に内包されるフィールドも
    // 送ってくるため、存在しないカラムをそのまま SET 句にすると
    // 「D1_ERROR: no such column: reflection_text」で 500 になる (編集→提出が必ず失敗していた)。
    const ALLOWED_COLUMNS = new Set([
      "entry_date", "week_number", "title", "content", "word_count", "status",
      "ocr_source", "ocr_confidence", "univ_teacher_comment", "school_mentor_comment", "teacher_comment",
    ]);
    const fields = Object.keys(body).filter(k => ALLOWED_COLUMNS.has(k));
    if (fields.length === 0) return c.json({ success: true });

    const setClause = fields.map(k => `${k} = ?`).join(", ");
    const values = fields.map(k => (body as any)[k as keyof typeof body]);

    await db.prepare(`UPDATE journal_entries SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .bind(...values, id)
      .run();
      
    const updated = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(id).first() as any;
    
    // Do not log full text content in audit
    const safeBefore = { ...beforeState };
    const safeAfter = { ...updated };
    delete safeBefore.content;
    delete safeAfter.content;

    setAuditWriteContext(c, {
      resourceType: 'journal',
      resourceId: id,
      targetStudentId: updated.student_id,
      entityOwnerUserId: updated.student_id,
      action: 'update',
      scopeBasis: 'self',
      changedFields: fields,
      beforeState: safeBefore,
      afterState: safeAfter,
      changeSummary: { operation: 'update' }
    });

    // ─────────────────────────────────────────────────────────
    // 自動連動: draft → submitted 遷移を検出して自動パイプライン起動
    //   重複防止: 既に該当 journal の AI評価レコード(eval_type='ai')が存在する場合はスキップ
    // ─────────────────────────────────────────────────────────
    const beforeStatus = String(beforeState.status || "");
    const afterStatus = String(updated.status || "");
    const transitioned = beforeStatus !== "submitted" && afterStatus === "submitted";
    let pipelineResult: any = null;
    let auto_pipeline_triggered = false;

    if (transitioned && (updated.content || "").length > 30) {
      // 既存AI評価チェック (重複起動防止)
      const existingEval = await db.prepare(
        `SELECT id FROM evaluations WHERE journal_id = ? AND eval_type = 'ai' LIMIT 1`
      ).bind(id).first().catch(() => null);

      if (!existingEval) {
        const user = (c.get("user" as any) as any) as any;
        const studentName = (user as any)?.name || "学生";
        const apiKey = (c.env as any)?.OPENAI_API_KEY;
        pipelineResult = await runJournalAutoPipeline(db, apiKey, {
          journalId: id,
          studentId: updated.student_id,
          studentName,
          weekNumber: updated.week_number || 1,
          content: updated.content || "",
        }, c.env);
        auto_pipeline_triggered = true;
      } else {
        pipelineResult = { skipped: true, reason: "AI evaluation already exists", existing_evaluation_id: (existingEval as any).id };
      }
    }

    // ─────────────────────────────────────────────────────────
    // 変更通知 (submitted → submitted の編集時)
    // 指導教員/メンターへ「日誌が編集されました」通知を送出
    // ─────────────────────────────────────────────────────────
    let edit_notifications_sent = 0;
    try {
      const isEditAfterSubmit = beforeStatus === "submitted" && afterStatus === "submitted" && fields.length > 0;
      if (isEditAfterSubmit) {
        const supervisors = await resolveStudentSupervisors(db, updated.student_id);
        const user = (c.get("user" as any) as any) as any;
        const actorName = (user as any)?.name || "学生";
        const significantFields = fields.filter(f => !["updated_at", "id", "student_id"].includes(f));
        edit_notifications_sent = await sendNotifications(db, supervisors, {
          actor_user_id: (user as any)?.id,
          type: "journal_updated",
          title: `${actorName} さんが日誌を編集しました`,
          body: `第${updated.week_number || "?"}週の日誌が編集されました (変更項目: ${significantFields.slice(0, 5).join(", ")}${significantFields.length > 5 ? " ..." : ""})`,
          resource_type: "journal",
          resource_id: id,
        });
      }
    } catch (e) {
      console.error("[journal edit notification] failed:", String(e));
    }

    return c.json({ ...updated, auto_pipeline_triggered, pipeline: pipelineResult, edit_notifications_sent });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// PATCH /journals/:id/comment
// 大学教員 / 校内指導教員 / 管理者が日誌へのコメントを保存・更新するための専用エンドポイント
// body: { univ_teacher_comment?: string, school_mentor_comment?: string, teacher_comment?: string }
dataRouter.patch(
  "/journals/:id/comment",
  requireRoles(["univ_teacher", "teacher", "school_mentor", "admin"] as UserRole[]),
  async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ error: "DB not configured" }, 503);
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));

    try {
      const target = await db.prepare("SELECT student_id FROM journal_entries WHERE id = ?").bind(id).first();
      if (!target) return c.json({ error: "見つかりません" }, 404);

      // スコープチェック (担当外の学生にコメント不可)
      const scope = await getScopeContext(c, db);
      if (!assertCanAccessStudent(scope, target.student_id as string)) {
        return c.json({ success: false, error: "forbidden", message: "この学生にコメントする権限がありません。" }, 403);
      }

      // 受け入れ可能カラムを限定
      const allowed = ["univ_teacher_comment", "school_mentor_comment", "teacher_comment"] as const;
      const updates: string[] = [];
      const values: unknown[] = [];
      for (const k of allowed) {
        if (typeof body[k] === "string") {
          updates.push(`${k} = ?`);
          values.push(body[k]);
        }
      }
      if (updates.length === 0) {
        return c.json({ success: false, error: "no_valid_fields" }, 400);
      }
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);
      await db.prepare(`UPDATE journal_entries SET ${updates.join(", ")} WHERE id = ?`).bind(...values).run();
      const updated = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(id).first();
      return c.json({ success: true, journal: updated });
    } catch (err) {
      return c.json({ error: String(err) }, 500);
    }
  }
);

dataRouter.delete("/journals/:id", requireRoles(["student", "admin"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const id = c.req.param("id");

  try {
    const target = await db.prepare("SELECT student_id FROM journal_entries WHERE id = ?").bind(id).first();
    if (!target) return c.json({ error: "見つかりません" }, 404);

    const scope = await getScopeContext(c, db);
    if (!assertCanAccessStudent(scope, target.student_id as string)) {
      return c.json({ success: false, error: "forbidden", message: "データアクセス範囲外です。" }, 403);
    }

    // 外部キー制約のため、子レコードから順に削除する
    // 1. evaluation_items (evaluations の子)
    await db.prepare(`
      DELETE FROM evaluation_items
      WHERE evaluation_id IN (SELECT id FROM evaluations WHERE journal_id = ?)
    `).bind(id).run();

    // 2. human_eval_items (human_evaluations の子)
    await db.prepare(`
      DELETE FROM human_eval_items
      WHERE human_eval_id IN (SELECT id FROM human_evaluations WHERE journal_id = ?)
    `).bind(id).run();

    // 3. evaluations / human_evaluations (journal_entries の子)
    await db.prepare("DELETE FROM evaluations WHERE journal_id = ?").bind(id).run();
    await db.prepare("DELETE FROM human_evaluations WHERE journal_id = ?").bind(id).run();

    // 4. learning_progress_scores (journal_id を持つが FK 制約は無いはず。念のため掃除)
    await db.prepare("DELETE FROM learning_progress_scores WHERE journal_id = ?").bind(id).run().catch(() => {});

    // 5. chat_sessions / chat_messages (journal_id を持つテーブル。FK 未設定でも掃除)
    await db.prepare("DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE journal_id = ?)").bind(id).run().catch(() => {});
    await db.prepare("DELETE FROM chat_sessions WHERE journal_id = ?").bind(id).run().catch(() => {});

    // 6. SCAT 関連 (journal_id を持つ複数テーブル)
    await db.prepare("DELETE FROM scat_analysis_results WHERE journal_id = ?").bind(id).run().catch(() => {});
    await db.prepare("DELETE FROM scat_detailed_segments WHERE journal_id = ?").bind(id).run().catch(() => {});

    // 7. 最後に journal_entries 本体
    await db.prepare("DELETE FROM journal_entries WHERE id = ?").bind(id).run();

    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.get("/chat-sessions/:journalId", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const journalId = c.req.param("journalId");
  
  try {
    const session = await db.prepare("SELECT * FROM chat_sessions WHERE journal_id = ?").bind(journalId).first();
    // セッション未作成は正常状態 (日誌提出直後やチャット未開始)。
    // 404 を返すとフロント側で無駄なネットワークエラーログが出るため、
    // 200 で「空セッション」を返してクライアントを単純化する。
    if (!session) {
      return c.json({
        id: null,
        journal_id: journalId,
        student_id: null,
        phase: "phase1",
        current_state: "phase1",
        phase_reached: "phase1",
        total_turns: 0,
        created_at: null,
        messages: [],
      });
    }
    
    const messages = await db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY message_order ASC").bind((session as any)?.id).all();
    const s = session as any;
    const mapped = (messages.results || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      phase: m.phase,
      reflection_depth: m.reflection_depth,
      timestamp: m.created_at,
    }));

    return c.json({
      id: s?.id,
      journal_id: s?.journal_id,
      student_id: s?.student_id,
      // 実テーブルは current_state / phase_reached（phase列は無い）
      phase: s?.current_state || s?.phase_reached || "phase1",
      current_state: s?.current_state,
      phase_reached: s?.phase_reached,
      total_turns: s?.total_turns,
      created_at: s?.created_at,
      messages: mapped
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.post("/chat-sessions/:journalId/messages", requireRoles(["student"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const jwtUser = c.get("user") as any;
  const journalId = c.req.param("journalId");
  const body = await c.req.json();

  // role / content は必須。role は user(=学生) / assistant(=生成AI) のみ許可。
  const role = body.role === "assistant" ? "assistant" : body.role === "user" ? "user" : null;
  if (!role || typeof body.content !== "string" || body.content.trim() === "") {
    return c.json({ error: "role(user|assistant) と content は必須です" }, 400);
  }
  // student_id は JWT を信頼源とする (なりすまし防止)。
  const studentId = jwtUser?.id || body.student_id || "user-001";
  const phase = typeof body.phase === "string" && body.phase ? body.phase : "phase1";

  try {
    // Session取得か作成。1日誌=1セッション。
    let session = await db.prepare("SELECT * FROM chat_sessions WHERE journal_id = ?").bind(journalId).first();
    if (!session) {
      const sessionId = "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
      // 実スキーマ: current_state / phase_reached を使用 (phase カラムは存在しない)
      await db.prepare(
        "INSERT INTO chat_sessions (id, journal_id, student_id, current_state, phase_reached, total_turns, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))"
      ).bind(sessionId, journalId, studentId, phase, phase).run();
      session = await db.prepare("SELECT * FROM chat_sessions WHERE id = ?").bind(sessionId).first();
    }

    const sid = (session as any)?.id;

    // メッセージ挿入 (message_order は現在の件数+1)
    const msgId = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    const order = await db.prepare("SELECT COUNT(*) as c FROM chat_messages WHERE session_id = ?").bind(sid).first();
    const nextOrder = ((order as any)?.c || 0) + 1;

    await db.prepare(`
      INSERT INTO chat_messages (id, session_id, message_order, phase, role, content, reflection_depth, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      msgId, sid, nextOrder, phase, role, body.content,
      typeof body.reflection_depth === "number" ? body.reflection_depth : null
    ).run();

    // セッション集計更新 (turn 数 / phase / RD 最大値)。total_turns は assistant 応答完了を1ターンとみなし user/assistant 両方で加算。
    await db.prepare(
      "UPDATE chat_sessions SET total_turns = total_turns + 1, current_state = ?, phase_reached = ?, max_rd_chat_level = MAX(max_rd_chat_level, ?), updated_at = datetime('now') WHERE id = ?"
    ).bind(phase, phase, typeof body.reflection_depth === "number" ? body.reflection_depth : 0, sid).run();

    return c.json({ success: true, message_id: msgId, session_id: sid });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.put("/goals/:id", requireRoles(["student"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const id = c.req.param("id");
  const body = await c.req.json();
  
  try {
    const fields = Object.keys(body).filter(k => k !== 'id');
    if (fields.length === 0) return c.json({ success: true });
    
    const setClause = fields.map(k => `${k} = ?`).join(", ");
    const values = fields.map(k => (body as any)[k as keyof typeof body]);
    
    await db.prepare(`UPDATE goals SET ${setClause} WHERE id = ?`)
      .bind(...values, id)
      .run();
      
    const updated = await db.prepare("SELECT * FROM goals WHERE id = ?").bind(id).first();
    return c.json(updated);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.get("/chat-sessions", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const user = c.get('user');
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const studentId = c.req.query("student_id");
  try {
    let sessions;

    // 学生は自分のセッションのみ（JWTのidを強制）
    let targetStudentId = studentId;
    if (user.role === "student") {
      targetStudentId = user.id;
    }

    // 各セッションに学生名・メッセージ数を付加して返す
    const baseSelect = `
      SELECT cs.*,
             u.name  AS student_name,
             u.email AS student_email,
             (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = cs.id) AS message_count
      FROM chat_sessions cs
      LEFT JOIN users u ON u.id = cs.student_id
    `;

    if (targetStudentId) {
      // 指定学生（または学生本人）のセッション
      sessions = await db.prepare(
        `${baseSelect} WHERE cs.student_id = ? ORDER BY cs.updated_at DESC, cs.created_at DESC`
      ).bind(targetStudentId).all();
    } else {
      // student_id 未指定で全件取得できるのは特権ロールのみ
      // 教員・メンター・研究者・管理者・委員会は全学生のログを閲覧可能
      sessions = await db.prepare(
        `${baseSelect} ORDER BY cs.student_id ASC, cs.updated_at DESC, cs.created_at DESC`
      ).all();
    }
    return c.json({ sessions: sessions.results || [] });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});


// 毎日誌単位のSCAT結果取得
dataRouter.get("/scat/journals/:journalId", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const journalId = c.req.param("journalId");
    const { results: analyses } = await db.prepare("SELECT * FROM journal_scat_analyses WHERE journal_id = ? ORDER BY created_at DESC LIMIT 1").bind(journalId).all();
    if (!analyses || analyses.length === 0) return c.json({ analysis: null, segments: [] });
    
    const analysis = analyses[0];
    const { results: segments } = await db.prepare("SELECT * FROM journal_scat_segments WHERE analysis_id = ? ORDER BY segment_order ASC").bind(analysis.id).all();
    
    return c.json({ analysis, segments });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// SCATバッチ分析: 各日誌の分析状態 (analysis_status) をmap で返す
dataRouter.get("/scat/batch-status", requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher", "univ_teacher", "school_mentor"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const { results } = await db.prepare(`
      SELECT journal_id, analysis_status FROM journal_scat_analyses
    `).all();
    const statusMap: Record<string, string> = {};
    for (const r of results as any[]) {
      // analysis_status: 'pending' | 'in_progress' | 'completed' | 'failed' を
      // フロント表示用 (processed/unprocessed/error) にマップ
      const s = String(r.analysis_status || "");
      statusMap[r.journal_id] = s === "completed" ? "processed" : s === "failed" ? "error" : "unprocessed";
    }
    return c.json({ success: true, statusMap });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// SCATバッチ実行: 選択日誌に対して journal_scat_analyses を作成 (デモ用即時 completed)
dataRouter.post("/scat/batch-run", requireRoles(["researcher", "admin", "collaborator", "teacher", "univ_teacher"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const body = await c.req.json().catch(() => ({}));
    const journalIds: string[] = Array.isArray((body as any).journal_ids) ? (body as any).journal_ids : [];
    if (journalIds.length === 0) return c.json({ created: 0, skipped: 0 });

    // 既存の分析を取得
    const placeholders = journalIds.map(() => "?").join(",");
    const { results: existing } = await db.prepare(
      `SELECT journal_id FROM journal_scat_analyses WHERE journal_id IN (${placeholders})`
    ).bind(...journalIds).all();
    const existingSet = new Set((existing as any[]).map(r => r.journal_id));

    let created = 0;
    const skipped = existingSet.size;
    const userId = (c.get("user") as any)?.id || "user-005";

    // デモテーマ集合 (実プロダクトでは LLM 呼び出し結果に置換)
    const demoThemes = [
      ["授業準備", "教材研究"],
      ["生徒指導", "個別支援"],
      ["振り返り", "省察"],
      ["時間管理", "学級経営"],
      ["教師観察", "教師の判断"],
    ];

    for (const jid of journalIds) {
      if (existingSet.has(jid)) continue;
      const analysisId = `jsa-batch-${jid}-${Date.now()}`;
      await db.prepare(`
        INSERT INTO journal_scat_analyses (id, journal_id, user_id, analysis_status, created_at, updated_at)
        VALUES (?, ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(analysisId, jid, userId).run();

      // 2 セグメントを作成 (ネットワーク図に共起ペアを発生させる)
      const pair = demoThemes[created % demoThemes.length];
      for (let i = 0; i < 2; i++) {
        const segId = `${analysisId}-seg-${i}`;
        await db.prepare(`
          INSERT INTO journal_scat_segments (id, analysis_id, journal_id, segment_order, raw_text, step1_focus_words, step2_outside_words, step3_explanatory_words, step4_theme_construct, step5_questions_issues, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          segId, analysisId, jid, i + 1,
          `(バッチ生成サンプルテキスト ${i + 1})`,
          "観察、記録", "授業の流れ、児童の反応",
          `${pair[i]}に関わる教育的判断`,
          pair[i],
          "次回の改善点を検討する"
        ).run();
      }
      created++;
    }

    return c.json({ success: true, created, skipped });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// SCATネットワーク分析用データ取得
dataRouter.get("/scat/network", requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    // キャッシュチェック (TTL 300秒)
    const noCache = c.req.query("no_cache") === "1";
    const cacheKey = "stats:scat:network";
    if (!noCache) {
      const cached = await getCachedStats(db, cacheKey);
      if (cached) return c.json({ ...cached, _cache: { hit: true, key: cacheKey } });
    }

    // SCAT の2系統 (journal_scat_segments / scat_codes) を両方統合する
    //  - journal_scat_segments: 日誌ベースの SCAT 分析結果
    //  - scat_codes: プロジェクトベース (SCATAnalysisPage) の手動コーディング結果
    // どちらの分析結果もネットワーク図に反映する (連動性確保)
    const { results: journalSegs } = await db.prepare(`
      SELECT jsa.journal_id AS group_id, jss.step4_theme_construct AS themes
      FROM journal_scat_segments jss
      JOIN journal_scat_analyses jsa ON jss.analysis_id = jsa.id
      WHERE jsa.analysis_status = 'completed' AND jss.step4_theme_construct != '' AND jss.step4_theme_construct IS NOT NULL
    `).all();

    const { results: projectSegs } = await db.prepare(`
      SELECT sc.segment_id AS group_id, sc.step4_theme AS themes
      FROM scat_codes sc
      WHERE sc.step4_theme IS NOT NULL AND sc.step4_theme != ''
    `).all();

    const segments = [...(journalSegs as any[]), ...(projectSegs as any[])];

    const nodesMap = new Map<string, number>();
    const edgesMap = new Map<string, number>();

    // group (journal or scat segment) ごとにテーマをグループ化して共起検出
    const groupThemes: Record<string, Set<string>> = {};
    for (const seg of segments) {
      const themeStr = String(seg.themes || "");
      const themes = themeStr.split(/[,、・\/／]/).map((t: string) => t.trim()).filter((t: string) => t);
      const gid = String(seg.group_id);
      if (!groupThemes[gid]) groupThemes[gid] = new Set();
      themes.forEach((t: string) => groupThemes[gid].add(t));

      themes.forEach((t: string) => {
        nodesMap.set(t, (nodesMap.get(t) || 0) + 1);
      });
    }

    // エッジ生成 (同一グループ内で共起するテーマのペア)
    Object.values(groupThemes).forEach(themeSet => {
      const themes = Array.from(themeSet);
      for (let i = 0; i < themes.length; i++) {
        for (let j = i + 1; j < themes.length; j++) {
          const t1 = themes[i];
          const t2 = themes[j];
          const edgeKey = t1 < t2 ? `${t1}||${t2}` : `${t2}||${t1}`;
          edgesMap.set(edgeKey, (edgesMap.get(edgeKey) || 0) + 1);
        }
      }
    });

    const nodes = Array.from(nodesMap.entries()).map(([id, val]) => ({ id, name: id, val }));
    // links 形式（フロントエンドが期待） + 互換用 edges
    const links = Array.from(edgesMap.entries()).map(([key, weight]) => {
      const [source, target] = key.split("||");
      return { source, target, val: weight };
    });
    const edges = links.map(l => ({ source: l.source, target: l.target, weight: l.val }));

    const payload = { nodes, links, edges };
    await setCachedStats(db, "stats:scat:network", payload, getDefaultStatsCacheTtl(c.env)).catch(() => {});
    return c.json({ ...payload, _cache: { hit: false, key: "stats:scat:network" } });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// SCATテーマ時系列推移（週ごとのテーマ出現頻度）
dataRouter.get("/scat/network/timeline", requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher", "univ_teacher", "school_mentor"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const noCache = c.req.query("no_cache") === "1";
    const limitParam = Math.max(1, Math.min(15, Number(c.req.query("limit") || 5)));
    const cacheKey = `stats:scat:timeline:l${limitParam}`;
    if (!noCache) {
      const cached = await getCachedStats(db, cacheKey);
      if (cached) return c.json({ ...cached, _cache: { hit: true, key: cacheKey } });
    }
    // SCAT 2系統 (journal_scat_segments / scat_codes) を両方含めて週次集計
    //  - journal_scat_segments: 日誌ベース
    //  - scat_codes: scat_segments.journal_id 経由で週番号を取得
    const { results: journalRows } = await db.prepare(`
      SELECT je.week_number AS week_number, jss.step4_theme_construct AS theme
      FROM journal_scat_segments jss
      JOIN journal_scat_analyses jsa ON jss.analysis_id = jsa.id
      JOIN journal_entries je ON jsa.journal_id = je.id
      WHERE jsa.analysis_status = 'completed'
        AND jss.step4_theme_construct IS NOT NULL
        AND jss.step4_theme_construct != ''
    `).all();

    const { results: projectRows } = await db.prepare(`
      SELECT je.week_number AS week_number, sc.step4_theme AS theme
      FROM scat_codes sc
      JOIN scat_segments ss ON sc.segment_id = ss.id
      JOIN journal_entries je ON ss.source_journal_id = je.id
      WHERE sc.step4_theme IS NOT NULL AND sc.step4_theme != ''
        AND ss.source_journal_id IS NOT NULL
    `).all();

    const results = [...(journalRows as any[]), ...(projectRows as any[])];

    // week -> { theme -> count }
    const matrix: Record<number, Record<string, number>> = {};
    const themesGlobal = new Map<string, number>();
    for (const r of results as any[]) {
      const wk = Number(r.week_number) || 0;
      const themes = String(r.theme).split(/[,、・]/).map((t: string) => t.trim()).filter((t: string) => t);
      if (!matrix[wk]) matrix[wk] = {};
      for (const t of themes) {
        matrix[wk][t] = (matrix[wk][t] || 0) + 1;
        themesGlobal.set(t, (themesGlobal.get(t) || 0) + 1);
      }
    }

    // 出現頻度の高い上位 5 テーマを採用
    // 表示テーマ数 (?limit=N で指定、default 5、max 15)
    const topThemes = Array.from(themesGlobal.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitParam)
      .map(([t]) => t);

    // 全 week を昇順に
    const weeks = Object.keys(matrix).map(n => Number(n)).sort((a, b) => a - b);
    const timeline = weeks.map(wk => {
      const row: Record<string, any> = { week: `Week ${wk}` };
      for (const t of topThemes) row[t] = matrix[wk][t] || 0;
      // その週に top に入っていないテーマも合計だけ表示
      const others = Object.entries(matrix[wk]).filter(([k]) => !topThemes.includes(k));
      row.others = others.reduce((s, [, v]) => s + (v as number), 0);
      return row;
    });

    const payload = { timeline, themes: topThemes, total_themes: themesGlobal.size };
    await setCachedStats(db, cacheKey, payload, getDefaultStatsCacheTtl(c.env)).catch(() => {});
    return c.json({ ...payload, _cache: { hit: false, key: cacheKey } });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────
// 通知 API
//   GET    /notifications              - 自分宛て通知一覧 (未読優先)
//   GET    /notifications/unread-count - 未読件数のみ
//   POST   /notifications/:id/read     - 既読化
//   POST   /notifications/mark-all-read - 全件既読化
//   POST   /notifications              - 通知作成 (admin/system 用)
// ──────────────────────────────────────────────────────────────────
dataRouter.get(
  "/notifications",
  requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]),
  async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ error: "DB not configured" }, 503);
    try {
      await ensureNotificationsSchema(db);
      const user = (c.get("user" as any) as any) as any;
      const userId = (user as any)?.id;
      const limit = Math.min(Number(c.req.query("limit") || 50), 200);
      const onlyUnread = c.req.query("unread") === "1" || c.req.query("unread") === "true";
      const sql = `
        SELECT id, recipient_user_id, actor_user_id, type, title, body,
               resource_type, resource_id, is_read, read_at, created_at
        FROM notifications
        WHERE recipient_user_id = ?
          ${onlyUnread ? "AND is_read = 0" : ""}
        ORDER BY is_read ASC, created_at DESC
        LIMIT ?
      `;
      const { results } = await db.prepare(sql).bind(userId, limit).all();
      const { results: cntRows } = await db.prepare(
        `SELECT COUNT(*) AS unread_count FROM notifications WHERE recipient_user_id = ? AND is_read = 0`
      ).bind(userId).all();
      const unread = Number((cntRows as any[])?.[0]?.unread_count || 0);
      return c.json({ success: true, notifications: results, unread_count: unread });
    } catch (err: any) {
      return c.json({ error: String(err) }, 500);
    }
  }
);

dataRouter.get(
  "/notifications/unread-count",
  requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]),
  async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ error: "DB not configured" }, 503);
    try {
      await ensureNotificationsSchema(db);
      const user = (c.get("user" as any) as any) as any;
      const userId = (user as any)?.id;
      const { results } = await db.prepare(
        `SELECT COUNT(*) AS unread_count FROM notifications WHERE recipient_user_id = ? AND is_read = 0`
      ).bind(userId).all();
      return c.json({ success: true, unread_count: Number((results as any[])?.[0]?.unread_count || 0) });
    } catch (err: any) {
      return c.json({ error: String(err) }, 500);
    }
  }
);

dataRouter.post(
  "/notifications/:id/read",
  requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]),
  async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ error: "DB not configured" }, 503);
    try {
      await ensureNotificationsSchema(db);
      const user = (c.get("user" as any) as any) as any;
      const userId = (user as any)?.id;
      const nid = c.req.param("id");
      const result = await db.prepare(
        `UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
         WHERE id = ? AND recipient_user_id = ?`
      ).bind(nid, userId).run();
      return c.json({ success: result.success, changes: result.meta?.changes || 0 });
    } catch (err: any) {
      return c.json({ error: String(err) }, 500);
    }
  }
);

dataRouter.post(
  "/notifications/mark-all-read",
  requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]),
  async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ error: "DB not configured" }, 503);
    try {
      await ensureNotificationsSchema(db);
      const user = (c.get("user" as any) as any) as any;
      const userId = (user as any)?.id;
      const result = await db.prepare(
        `UPDATE notifications SET is_read = 1, read_at = CURRENT_TIMESTAMP
         WHERE recipient_user_id = ? AND is_read = 0`
      ).bind(userId).run();
      return c.json({ success: true, marked: result.meta?.changes || 0 });
    } catch (err: any) {
      return c.json({ error: String(err) }, 500);
    }
  }
);

// ──────────────────────────────────────────────────────────────────
// 統計キャッシュ API (research 系画面が高頻度叩く前提の事前計算結果ストア)
//   GET  /stats-cache/:key  - キャッシュエントリ取得
//   POST /stats-cache/:key  - キャッシュエントリ更新 (body: { payload, ttl_seconds })
//   POST /stats-cache/invalidate - パターン無効化 (body: { pattern })
// ──────────────────────────────────────────────────────────────────
// IMPORTANT: 具体的なルート (/invalidate) を /:key より先に定義する必要がある (Hono はマッチ順評価)
dataRouter.post(
  "/stats-cache/invalidate",
  requireRoles(["researcher", "admin", "collaborator"]),
  async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ error: "DB not configured" }, 503);
    try {
      await ensureStatsCacheSchema(db);
      let body: any = {};
      try { body = await c.req.json(); } catch (_) { body = {}; }
      const pattern = String((body && body.pattern) || "%");
      const result = await db.prepare(`DELETE FROM stats_cache WHERE cache_key LIKE ?`).bind(pattern).run();
      return c.json({ success: true, deleted: (result.meta as any)?.changes || 0, pattern });
    } catch (err: any) {
      return c.json({ error: String(err) }, 500);
    }
  }
);

dataRouter.get(
  "/stats-cache/:key",
  requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher", "univ_teacher", "school_mentor"]),
  async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ error: "DB not configured" }, 503);
    const key = c.req.param("key");
    const cached = await getCachedStats(db, key);
    if (!cached) return c.json({ success: true, hit: false, payload: null });
    return c.json({ success: true, hit: true, payload: cached });
  }
);

dataRouter.post(
  "/stats-cache/:key",
  requireRoles(["researcher", "admin", "collaborator", "board_observer"]),
  async (c) => {
    const db = c.env?.DB;
    if (!db) return c.json({ error: "DB not configured" }, 503);
    try {
      const key = c.req.param("key");
      const body = await c.req.json();
      const ttl = Number(body.ttl_seconds || 300);
      await setCachedStats(db, key, body.payload, ttl);
      return c.json({ success: true, key, ttl_seconds: ttl });
    } catch (err: any) {
      return c.json({ error: String(err) }, 500);
    }
  }
);

export default dataRouter;

// --- BFI Endpoints ---

// 並川式 BFI-29 項目定義 (item_id, factor, 逆転項目フラグ, 設問文)
// factorMap と整合させた 29 項目構成
const NAMIKAWA_BFI_ITEMS: Array<{ item_id: number; factor: string; reverse: boolean; question: string }> = [
  // 外向性 (Extraversion)
  { item_id: 1, factor: "extraversion", reverse: false, question: "話し好きである" },
  { item_id: 2, factor: "extraversion", reverse: false, question: "活発で精力的である" },
  { item_id: 3, factor: "extraversion", reverse: false, question: "人付き合いが上手である" },
  { item_id: 4, factor: "extraversion", reverse: false, question: "陽気な人だと言われる" },
  { item_id: 5, factor: "extraversion", reverse: true,  question: "無口である" },
  // 神経症傾向 (Neuroticism)
  { item_id: 6, factor: "neuroticism", reverse: false, question: "不安になりやすい" },
  { item_id: 7, factor: "neuroticism", reverse: false, question: "緊張しやすい" },
  { item_id: 8, factor: "neuroticism", reverse: false, question: "心配性である" },
  { item_id: 9, factor: "neuroticism", reverse: false, question: "落ち込みやすい" },
  { item_id: 10, factor: "neuroticism", reverse: false, question: "気分の浮き沈みが激しい" },
  // 開放性 (Openness)
  { item_id: 11, factor: "openness", reverse: false, question: "好奇心が強い" },
  { item_id: 12, factor: "openness", reverse: false, question: "想像力が豊かである" },
  { item_id: 13, factor: "openness", reverse: false, question: "芸術に興味がある" },
  { item_id: 14, factor: "openness", reverse: false, question: "新しいことに挑戦したい" },
  { item_id: 15, factor: "openness", reverse: false, question: "アイディアが豊富である" },
  { item_id: 16, factor: "openness", reverse: false, question: "深く考えることが好きである" },
  // 協調性 (Agreeableness)
  { item_id: 17, factor: "agreeableness", reverse: false, question: "他人に優しい" },
  { item_id: 18, factor: "agreeableness", reverse: false, question: "人と協力するのが得意である" },
  { item_id: 19, factor: "agreeableness", reverse: false, question: "信頼できる人である" },
  { item_id: 20, factor: "agreeableness", reverse: true,  question: "他人とよく衝突する" },
  { item_id: 21, factor: "agreeableness", reverse: true,  question: "冷たい人だと言われる" },
  { item_id: 22, factor: "agreeableness", reverse: true,  question: "自己中心的である" },
  // 誠実性 (Conscientiousness)
  { item_id: 23, factor: "conscientiousness", reverse: false, question: "計画的に物事を進める" },
  { item_id: 24, factor: "conscientiousness", reverse: false, question: "几帳面である" },
  { item_id: 25, factor: "conscientiousness", reverse: true,  question: "怠け者である" },
  { item_id: 26, factor: "conscientiousness", reverse: true,  question: "だらしないところがある" },
  { item_id: 27, factor: "conscientiousness", reverse: true,  question: "計画を立てるのが苦手である" },
  { item_id: 28, factor: "conscientiousness", reverse: true,  question: "決めたことを守れないことが多い" },
  { item_id: 29, factor: "conscientiousness", reverse: true,  question: "物事を後回しにしがちである" },
];

// BFI 5 因子スコア計算ヘルパ
function calculateBfiScores(responses: Record<string | number, any>): Record<string, number> {
  const factorMap: Record<string, number[]> = {
    extraversion: [1, 2, 3, 4, -5],
    neuroticism: [6, 7, 8, 9, 10],
    openness: [11, 12, 13, 14, 15, 16],
    agreeableness: [17, 18, 19, -20, -21, -22],
    conscientiousness: [23, 24, -25, -26, -27, -28, -29],
  };
  const scores: Record<string, number> = {};
  for (const [factor, items] of Object.entries(factorMap)) {
    let sum = 0;
    let count = 0;
    for (const id of items) {
      const absId = Math.abs(id);
      const raw = responses[absId] ?? responses[String(absId)];
      const val = parseInt(String(raw), 10);
      if (isNaN(val)) continue;
      sum += id < 0 ? 6 - val : val;
      count++;
    }
    scores[factor] = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
  }
  return scores;
}

// BFI 設問項目取得 (誰でも参照可能)
dataRouter.get("/bfi/items", async (c) => {
  return c.json({
    total: NAMIKAWA_BFI_ITEMS.length,
    scale: { min: 1, max: 5, labels: ["全く当てはまらない", "あまり当てはまらない", "どちらでもない", "やや当てはまる", "とても当てはまる"] },
    items: NAMIKAWA_BFI_ITEMS,
  });
});

// BFI スコア取得 (集計値)
dataRouter.get("/bfi/scores/:userId", requireRoles(["student", "researcher", "admin", "collaborator", "board_observer", "univ_teacher", "school_mentor"]), async (c) => {
  const jwtUser = c.get("user") as any;
  const authUserId = jwtUser?.id;
  const jwtRole = jwtUser?.role as string;
  const { env } = c;
  const userId = c.req.param("userId");
  const canViewAll = ["researcher", "admin", "collaborator", "board_observer", "univ_teacher", "school_mentor"].includes(jwtRole);
  if (!canViewAll && userId !== authUserId) return c.json({ error: "認証されていません" }, 401);

  try {
    const row = await env.DB.prepare(
      "SELECT extraversion, neuroticism, openness, agreeableness, conscientiousness, is_completed, updated_at FROM user_bfi_scores WHERE user_id = ?"
    ).bind(userId).first();

    if (!row) {
      // 回答数から自動算出 (フォールバック)
      const respRes = await env.DB.prepare(
        "SELECT item_id, score FROM namikawa_bfi_responses WHERE user_id = ?"
      ).bind(userId).all();
      const responses: Record<string, number> = {};
      for (const r of respRes.results || []) {
        responses[String((r as any).item_id)] = (r as any).score;
      }
      const answered = Object.keys(responses).length;
      if (answered === 0) {
        return c.json({ scores: null, is_completed: false, answered: 0, total: 29 });
      }
      const scores = calculateBfiScores(responses);
      return c.json({ scores, is_completed: answered >= 29, answered, total: 29, computed_on_the_fly: true });
    }

    return c.json({
      scores: {
        extraversion: row.extraversion,
        neuroticism: row.neuroticism,
        openness: row.openness,
        agreeableness: row.agreeableness,
        conscientiousness: row.conscientiousness,
      },
      is_completed: !!row.is_completed,
      updated_at: row.updated_at,
    });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

dataRouter.post("/bfi/save", requireRoles(["student"] as UserRole[]), async (c) => {
  const jwtUser = c.get("user") as any;
  const authUserId = jwtUser?.id;
  const { env } = c;
  const body = await c.req.json();
  const userId = body.userId;
  if (userId !== authUserId) return c.json({ error: '認証されていません' }, 401);
  const responses = body.responses; // { "1": 5, "2": 3, ... }
  
  if (!userId || !responses) return c.json({ error: "Invalid request" }, 400);

  // Validate items and scores
  for (const [itemId, score] of Object.entries(responses)) {
    const id = parseInt(itemId, 10);
    const val = parseInt(score as string, 10);
    if (id < 1 || id > 29 || val < 1 || val > 5) {
      return c.json({ error: "Invalid item_id or score. Must be 1-29 and 1-5." }, 400);
    }
    await env.DB.prepare(
      "INSERT INTO namikawa_bfi_responses (user_id, item_id, score) VALUES (?, ?, ?) ON CONFLICT(user_id, item_id) DO UPDATE SET score=excluded.score, updated_at=CURRENT_TIMESTAMP"
    ).bind(userId, id, val).run();
  }

  // Calculate scores if complete
  if (Object.keys(responses).length === 29) {
    // NAMIKAWA_29_ITEMS mapping
    const factorMap = {
      extraversion: [1, 2, 3, 4, -5],
      neuroticism: [6, 7, 8, 9, 10],
      openness: [11, 12, 13, 14, 15, 16],
      agreeableness: [17, 18, 19, -20, -21, -22],
      conscientiousness: [23, 24, -25, -26, -27, -28, -29]
    };
    
    const scores: Record<string, number> = {};
    for (const [factor, items] of Object.entries(factorMap)) {
      let sum = 0;
      for (const id of items) {
        const absId = Math.abs(id);
        const val = parseInt(responses[absId], 10);
        sum += id < 0 ? (6 - val) : val;
      }
      scores[factor] = sum / items.length;
    }

    await env.DB.prepare(
      "INSERT INTO user_bfi_scores (user_id, extraversion, neuroticism, openness, agreeableness, conscientiousness, is_completed) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(user_id) DO UPDATE SET extraversion=excluded.extraversion, neuroticism=excluded.neuroticism, openness=excluded.openness, agreeableness=excluded.agreeableness, conscientiousness=excluded.conscientiousness, is_completed=1, updated_at=CURRENT_TIMESTAMP"
    ).bind(userId, scores.extraversion, scores.neuroticism, scores.openness, scores.agreeableness, scores.conscientiousness).run();

    return c.json({ success: true, isCompleted: true, scores });
  }

  return c.json({ success: true, isCompleted: false });
});

dataRouter.get("/bfi/responses/:userId", requireRoles(["student", "researcher", "admin", "collaborator", "board_observer", "univ_teacher", "school_mentor"]), async (c) => {
  const jwtUser = c.get("user") as any;
  const authUserId = jwtUser?.id;
  const jwtRole = jwtUser?.role as string;
  const { env } = c;
  const userId = c.req.param('userId');
  // student は自分のデータのみ、researcher/admin/collaborator/board_observer/univ_teacher/school_mentor は全員分参照可
  const canViewAll = ["researcher", "admin", "collaborator", "board_observer", "univ_teacher", "school_mentor"].includes(jwtRole);
  if (!canViewAll && userId !== authUserId) return c.json({ error: '認証されていません' }, 401);
  try {
    const res = await env.DB.prepare("SELECT item_id, score FROM namikawa_bfi_responses WHERE user_id = ?").bind(userId).all();
    const responses: Record<number, number> = {};
    for (const row of res.results || []) {
      responses[(row as any).item_id as number] = (row as any).score as number;
    }
    const answered = Object.keys(responses).length;
    const isCompleted = answered >= 29;
    const scores = answered > 0 ? calculateBfiScores(responses) : null;
    return c.json({
      user_id: userId,
      responses,
      answered,
      total: 29,
      is_completed: isCompleted,
      scores,
    });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// ──────────────────────────────────────────────────────────────────
// BFI × 省察深度 統合分析
// ・BFI 5因子スコア
// ・AI評価4因子スコア (全提出済日誌の平均)
// ・省察深度 (RD0〜RD4) 分布 + 平均
// ・SCAT分析の直近テーマ
// ・パーソナリティ ⇄ 各評価次元のピアソン相関 (学生本人の時系列)
// ・LLM による文脈解釈 (強み/弱み/相関洞察/伸ばし方の提言)
// ──────────────────────────────────────────────────────────────────
function pearsonCorrelation(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return null;
  return num / Math.sqrt(dx2 * dy2);
}

function rdLevelToScore(rd: string | null | undefined): number | null {
  if (!rd) return null;
  const m: Record<string, number> = { RD0: 0, RD1: 1, RD2: 2, RD3: 3, RD4: 4 };
  return m[rd] ?? null;
}

dataRouter.get("/bfi/integrated-analysis/:userId", requireRoles(["student", "researcher", "admin", "collaborator", "board_observer", "univ_teacher", "school_mentor"]), async (c) => {
  const jwtUser = c.get("user") as any;
  const authUserId = jwtUser?.id;
  const jwtRole = jwtUser?.role as string;
  const { env } = c;
  const userId = c.req.param("userId");
  const canViewAll = ["researcher", "admin", "collaborator", "board_observer", "univ_teacher", "school_mentor"].includes(jwtRole);
  if (!canViewAll && userId !== authUserId) return c.json({ error: "認証されていません" }, 401);

  const db = env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    // スキーマブートストラップ (journals, evaluations, evaluation_items, etc.)
    await ensureSchema(db).catch(() => {});
    // namikawa_bfi_responses が無い場合に備えて簡易作成
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS namikawa_bfi_responses (
        user_id TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, item_id)
      )
    `).run().catch(() => {});
    // ① BFI スコア取得
    const bfiRes = await db.prepare("SELECT item_id, score FROM namikawa_bfi_responses WHERE user_id = ?").bind(userId).all();
    const responses: Record<number, number> = {};
    for (const row of bfiRes.results || []) {
      responses[(row as any).item_id as number] = (row as any).score as number;
    }
    const answered = Object.keys(responses).length;
    if (answered === 0) {
      return c.json({
        user_id: userId,
        status: "no_bfi",
        message: "BFI 未回答です。先に /bfi で 29 項目に回答してください。",
        next_step: "/bfi",
      });
    }
    const bfiScores = calculateBfiScores(responses);

    // ② 学生名取得
    const userRow: any = await db.prepare("SELECT name FROM users WHERE id = ?").bind(userId).first().catch(() => null);
    const studentName = userRow?.name || "学生";

    // ③ AI評価データ取得 (該当学生の全 submitted 日誌)
    let evaluations: any[] = [];
    try {
      const evalRes = await db.prepare(`
        SELECT e.id as eval_id, e.journal_id, e.total_score, e.factor1_score, e.factor2_score, e.factor3_score, e.factor4_score, e.factor5_score, e.factor6_score,
               j.week_number, j.entry_date
        FROM evaluations e
        INNER JOIN journal_entries j ON j.id = e.journal_id
        WHERE j.student_id = ? AND e.eval_type = 'ai'
        ORDER BY j.week_number ASC, j.entry_date ASC
      `).bind(userId).all();
      evaluations = (evalRes.results || []) as any[];
    } catch (eEval) {
      console.warn("evaluations/journals table not available:", String(eEval).slice(0, 120));
    }

    // ④ RD分布
    let rdDistribution: Record<string, number> = { RD0: 0, RD1: 1, RD2: 0, RD3: 0, RD4: 0 };
    rdDistribution = { RD0: 0, RD1: 0, RD2: 0, RD3: 0, RD4: 0 };
    let rdScores: number[] = [];
    if (evaluations.length > 0) {
      try {
        const evalIds = evaluations.map(e => e.eval_id);
        const placeholders = evalIds.map(() => "?").join(",");
        const itemRes = await db.prepare(`SELECT rd_level FROM evaluation_items WHERE evaluation_id IN (${placeholders}) AND rd_level IS NOT NULL`).bind(...evalIds).all().catch(() => ({ results: [] as any[] }));
        for (const r of (itemRes.results || []) as any[]) {
          const rd = String(r.rd_level || "");
          if (rdDistribution[rd] !== undefined) rdDistribution[rd]++;
          const sc = rdLevelToScore(rd);
          if (sc !== null) rdScores.push(sc);
        }
      } catch (eRd) {
        console.warn("evaluation_items.rd_level lookup failed:", String(eRd).slice(0, 120));
      }
    }
    const avgRdScore = rdScores.length > 0 ? rdScores.reduce((s, v) => s + v, 0) / rdScores.length : 0;

    // ⑤ AI評価4因子平均
    const factorAverages: Record<string, number> = { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0 };
    if (evaluations.length > 0) {
      let cnt1 = 0, cnt2 = 0, cnt3 = 0, cnt4 = 0, cnt5 = 0, cnt6 = 0;
      let sum1 = 0, sum2 = 0, sum3 = 0, sum4 = 0, sum5 = 0, sum6 = 0;
      for (const ev of evaluations) {
        if (typeof ev.factor1_score === "number") { sum1 += ev.factor1_score; cnt1++; }
        if (typeof ev.factor2_score === "number") { sum2 += ev.factor2_score; cnt2++; }
        if (typeof ev.factor3_score === "number") { sum3 += ev.factor3_score; cnt3++; }
        if (typeof ev.factor4_score === "number") { sum4 += ev.factor4_score; cnt4++; }
        if (typeof ev.factor5_score === "number") { sum5 += ev.factor5_score; cnt5++; }
        if (typeof ev.factor6_score === "number") { sum6 += ev.factor6_score; cnt6++; }
      }
      factorAverages.f1 = cnt1 > 0 ? sum1 / cnt1 : 0;
      factorAverages.f2 = cnt2 > 0 ? sum2 / cnt2 : 0;
      factorAverages.f3 = cnt3 > 0 ? sum3 / cnt3 : 0;
      factorAverages.f4 = cnt4 > 0 ? sum4 / cnt4 : 0;
      factorAverages.f5 = cnt5 > 0 ? sum5 / cnt5 : 0;
      factorAverages.f6 = cnt6 > 0 ? sum6 / cnt6 : 0;
    }

    // ⑥ SCAT 直近テーマ取得 (テーブル不在も許容)
    await db.prepare(`ALTER TABLE journal_scat_analyses ADD COLUMN primary_themes TEXT`).run().catch(() => {});
    const scatRes = await db.prepare(`
      SELECT primary_themes FROM journal_scat_analyses
      WHERE user_id = ? AND primary_themes IS NOT NULL
      ORDER BY created_at DESC LIMIT 5
    `).bind(userId).all().catch(() => ({ results: [] as any[] }));
    const recentThemes: string[] = [];
    for (const row of (scatRes.results || []) as any[]) {
      try {
        const arr = JSON.parse(row.primary_themes || "[]");
        if (Array.isArray(arr)) recentThemes.push(...arr.slice(0, 2));
      } catch {}
    }
    const uniqueThemes = Array.from(new Set(recentThemes)).slice(0, 8);

    // ⑦ パーソナリティ × 評価次元の相関 (時系列ではなく対象学生群との比較は未対応のため、
    //    ここでは「全評価の各因子スコア時系列」と「BFI 5因子定数」の相関を取る代わりに、
    //    全学生の BFI × 平均評価スコアでクロス集団相関を計算する)
    const correlations: Record<string, number | null> = {};
    try {
      const allBfiRows = await db.prepare(`
        SELECT user_id, item_id, score FROM namikawa_bfi_responses
      `).all().catch(() => ({ results: [] as any[] }));
      const allBfi: Record<string, Record<number, number>> = {};
      for (const r of (allBfiRows.results || []) as any[]) {
        const uid = String(r.user_id);
        if (!allBfi[uid]) allBfi[uid] = {};
        allBfi[uid][Number(r.item_id)] = Number(r.score);
      }
      const allEvalRows = await db.prepare(`
        SELECT j.student_id, AVG(e.total_score) AS avg_total,
               AVG(e.factor1_score) AS avg_f1, AVG(e.factor2_score) AS avg_f2,
               AVG(e.factor3_score) AS avg_f3, AVG(e.factor4_score) AS avg_f4,
               AVG(e.factor5_score) AS avg_f5, AVG(e.factor6_score) AS avg_f6
        FROM evaluations e
        INNER JOIN journal_entries j ON j.id = e.journal_id
        WHERE e.eval_type = 'ai'
        GROUP BY j.student_id
      `).all().catch(() => ({ results: [] as any[] }));
      const allEval: Record<string, any> = {};
      for (const r of (allEvalRows.results || []) as any[]) {
        allEval[String(r.student_id)] = r;
      }

      const pairUserIds = Object.keys(allBfi).filter(uid => allEval[uid] && Object.keys(allBfi[uid]).length >= 29);
      if (pairUserIds.length >= 3) {
        const personalityFactors = ["extraversion", "neuroticism", "openness", "agreeableness", "conscientiousness"];
        const evalDimensions: Array<{ key: string; label: string }> = [
          { key: "avg_total", label: "total" },
          { key: "avg_f1", label: "f1" },
          { key: "avg_f2", label: "f2" },
          { key: "avg_f3", label: "f3" },
          { key: "avg_f4", label: "f4" },
          { key: "avg_f5", label: "f5" },
          { key: "avg_f6", label: "f6" },
        ];
        for (const pf of personalityFactors) {
          const bfiVec = pairUserIds.map(uid => calculateBfiScores(allBfi[uid])[pf] || 0);
          for (const ed of evalDimensions) {
            const evalVec = pairUserIds.map(uid => Number(allEval[uid][ed.key]) || 0);
            const r = pearsonCorrelation(bfiVec, evalVec);
            correlations[`${pf}_x_${ed.label}`] = r !== null ? Math.round(r * 1000) / 1000 : null;
          }
        }
      }
    } catch (eCorr) {
      console.error("Correlation calculation failed:", String(eCorr));
    }

    // ⑧ LLM 統合解釈
    const apiKey = (c.env as any)?.OPENAI_API_KEY;
    let llmInsights: any = null;
    if (apiKey) {
      try {
        const prompt = buildBfiIntegratedPrompt({
          studentName,
          bfiScores,
          rdDistribution,
          avgRdScore,
          recentThemes: uniqueThemes,
          factorAverages,
        });
        const raw = await callOpenAI(apiKey, [{ role: "user", content: prompt }], 0.3, resolveModel(c.env), { baseUrl: getChatCompletionsUrl(c.env).replace(/\/chat\/completions$/, "") });
        llmInsights = JSON.parse(raw);
      } catch (eLlm) {
        console.error("BFI integrated LLM failed:", String(eLlm));
        llmInsights = { error: String(eLlm).slice(0, 200) };
      }
    } else {
      llmInsights = { error: "OPENAI_API_KEY not configured" };
    }

    return c.json({
      user_id: userId,
      student_name: studentName,
      bfi: {
        scores: bfiScores,
        answered,
        is_completed: answered >= 29,
      },
      evaluation: {
        total_count: evaluations.length,
        factor_averages: {
          f1: Math.round(factorAverages.f1 * 100) / 100,
          f2: Math.round(factorAverages.f2 * 100) / 100,
          f3: Math.round(factorAverages.f3 * 100) / 100,
          f4: Math.round(factorAverages.f4 * 100) / 100,
        },
      },
      reflection_depth: {
        distribution: rdDistribution,
        avg_score: Math.round(avgRdScore * 100) / 100,
        total_items: rdScores.length,
      },
      scat: {
        recent_themes: uniqueThemes,
      },
      correlations,
      correlation_note: Object.keys(correlations).length > 0
        ? "全BFI回答済学生(N>=3)を母集団としたクロスセクション・ピアソン相関係数 (-1〜+1)"
        : "相関計算には BFI 完答済の学生が 3 名以上必要です",
      llm_insights: llmInsights,
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("BFI integrated analysis error:", String(e));
    return c.json({ error: String(e) }, 500);
  }
});


// ユーザー管理
dataRouter.get("/users", requireRoles(["admin", "researcher"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  const { results } = await db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  return c.json({ success: true, users: results });
});

dataRouter.post("/users", requireRoles(["admin"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  const body = await c.req.json();
  const id = body.id || `user-${Date.now()}`;
  try {
    await db.prepare(`
      INSERT INTO users (id, email, name, role, student_number, grade)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, body.email, body.name, body.role || 'student', body.student_number || null, body.grade || null).run();
    return c.json({ success: true, user: { ...body, id } });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.put("/users/:id", requireRoles(["admin"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  const id = c.req.param("id");
  const body = await c.req.json();
  try {
    await db.prepare(`
      UPDATE users SET email = ?, name = ?, role = ?, student_number = ?, grade = ?
      WHERE id = ?
    `).bind(body.email, body.name, body.role, body.student_number || null, body.grade || null, id).run();
    return c.json({ success: true, user: { ...body, id } });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.delete("/users/:id", requireRoles(["admin"] as UserRole[]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  const id = c.req.param("id");
  try {
    await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ── Auth ──
import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";

dataRouter.post("/auth/login", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const body = await c.req.json();
  await ensureSchema(db);
  const { email, password } = body;
  
  if (!email || !password) {
    return c.json({ error: "Email and password required" }, 400);
  }
  
  try {
    const user = await db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    if (!user) {
      return c.json({ error: "User not found" }, 401);
    }
    
    // Check password
    if (user.password_hash) {
      const isValid = await bcrypt.compare(password as string, (user as any).password_hash as string);
      if (!isValid) {
        return c.json({ error: "Invalid credentials" }, 401);
      }
    } else {
      // For legacy seed users that don't have password_hash, let's accept 'password' and update hash later ideally, but here just reject
      if (password !== 'password') {
        return c.json({ error: "Invalid credentials" }, 401);
      }
    }
    
    const secret = (c.env as any)?.JWT_SECRET || "default_local_secret_key_for_dev_only";
    
    // Generate actual JWT
    const payload = {
      id: (user as any).id,
      email: user.email,
      role: (user as any).role,
      name: user.name,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours expiration
    };
    
    const token = await sign(payload, secret);
    
    return c.json({ 
      success: true, 
      user: {
        id: (user as any).id,
        email: user.email,
        name: user.name,
        role: (user as any).role,
        student_number: user.student_number,
        grade: user.grade
      }, 
      token 
    });
  } catch (err) {
    console.error("Login error:", err);
    return c.json({ error: String(err) }, 500);
  }
});


dataRouter.route("/exports", exportsRouter);
dataRouter.route("/analysis", analysisRouter);
dataRouter.route("/journal-imports", journalImportsRouter);
