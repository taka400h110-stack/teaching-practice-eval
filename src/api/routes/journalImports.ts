/**
 * 研究者用：過去日誌の一括取り込みルート
 *
 * エンドポイント (全て /api/data/journal-imports 配下):
 *   POST   /upload          ファイルアップロード + toMarkdown 抽出
 *   POST   /:id/structure   GPT-4 で日誌スキーマに構造化
 *   PATCH  /:id             student_id / structured_json 修正 (手動編集)
 *   POST   /:id/commit      journal_entries にコミット
 *   GET    /                一覧
 *   GET    /:id             詳細
 *   DELETE /:id             削除
 *   GET    /formats         対応形式一覧 (toMarkdown 由来)
 */
import { Hono } from "hono";
import { requireAuth, requireRoles } from "../middleware/auth";
import { setAuditReadContext } from "../middleware/audit";
import { UserRole } from "../../types";
import type { D1Database } from "@cloudflare/workers-types";
import {
  describe,
  pearson,
  welchTTest,
  pairedTTest,
  fmt,
  fmtP,
  fmtCoef,
  pStars,
  fmtCell,
  fmtPCell,
  formatSkipReason,
  correctPValues,
  parseCorrectionMethod,
  formatCorrectionMethod,
  type DescriptiveStats,
  type MultipleComparisonMethod,
  type TTestResult,
} from "../utils/stats";
import { requireWeekNumber, validateWeekNumber } from "../utils/validation";
import {
  createImportRecord,
  extractDocument,
  getImportRecord,
  isSupportedMime,
  normalizeMime,
  structureWithGpt,
  structuredToJournalContent,
  estimateWordCount,
  updateImportRecord,
  type StructuredJournal,
} from "../services/journalImportService";

type Env = {
  Bindings: CloudflareBindings;
  Variables: { user: any };
};

const journalImportsRouter = new Hono<Env>();

const WRITE_ROLES: UserRole[] = ["researcher", "admin", "collaborator"];
const READ_ROLES: UserRole[] = [
  "researcher",
  "admin",
  "collaborator",
  "board_observer",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// ────────────────────────────────────────────────────────────────
// GET /formats - 対応形式一覧
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/formats",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const ai = c.env.AI as any;
    let supported: any[] = [];
    try {
      if (ai && typeof ai.toMarkdown === "function") {
        const handle = ai.toMarkdown();
        if (handle && typeof handle.supported === "function") {
          supported = await handle.supported();
        }
      }
    } catch (e) {
      // ignore
    }
    return c.json({
      success: true,
      // toMarkdown が動的に返してくる正本
      supported_via_to_markdown: supported,
      // 当方で手動扱いのもの
      additionally_supported: [
        { mime: "application/msword", extension: ".doc", note: "toMarkdown 試行 → 失敗時は .docx 変換を案内" },
        { mime: "image/heic", extension: ".heic", note: "Google Cloud Vision フォールバック" },
        { mime: "image/heif", extension: ".heif", note: "Google Cloud Vision フォールバック" },
      ],
      max_file_size_bytes: MAX_FILE_SIZE,
    });
  },
);

// ────────────────────────────────────────────────────────────────
// 共通ユーティリティ
// ────────────────────────────────────────────────────────────────
const BLOCK_KEYS = [
  "block_morning",
  "block_p1",
  "block_p2",
  "block_p3",
  "block_p4",
  "block_lunch",
  "block_p5",
  "block_p6",
  "block_cleaning",
  "block_closing",
  "block_after",
];

function csvEscape(v: any): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

function safeJsonParse<T = any>(s: string | null | undefined): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────
// GET /export.csv - CSV エクスポート (フィルタも適用、最大 5000 件)
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/export.csv",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const status = c.req.query("status");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    const q = c.req.query("q"); // ファイル名検索

    let sql = `SELECT ji.*, u.name AS student_name
               FROM journal_imports ji
               LEFT JOIN users u ON u.id = ji.student_id
               WHERE 1=1`;
    const params: any[] = [];

    if (user.role !== "admin") {
      sql += ` AND ji.uploaded_by = ?`;
      params.push(user.id);
    }
    if (status) {
      sql += ` AND ji.status = ?`;
      params.push(status);
    }
    if (studentId) {
      sql += ` AND ji.student_id = ?`;
      params.push(studentId);
    }
    if (fromDate) {
      sql += ` AND ji.entry_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      sql += ` AND ji.entry_date <= ?`;
      params.push(toDate);
    }
    if (q) {
      sql += ` AND ji.filename LIKE ?`;
      params.push(`%${q}%`);
    }
    sql += ` ORDER BY
              CASE WHEN ji.student_id IS NULL THEN 1 ELSE 0 END,
              ji.student_id ASC,
              CASE WHEN ji.week_number IS NULL THEN 1 ELSE 0 END,
              ji.week_number ASC,
              CASE WHEN ji.entry_date IS NULL THEN 1 ELSE 0 END,
              ji.entry_date ASC
            LIMIT 5000`;

    const res = await db
      .prepare(sql)
      .bind(...params)
      .all<any>();
    const rows = res.results || [];

    // CSV 構築 (RFC 4180)
    const headers = [
      "id",
      "filename",
      "student_id",
      "student_name",
      "entry_date",
      "week_number",
      "status",
      "extract_source",
      "mime_type",
      "file_size",
      "word_count",
      "token_count",
      "title",
      "reflection",
      "confidence",
      "journal_id",
      "error_message",
      "created_at",
      "updated_at",
    ];

    const escape = (v: any): string => {
      if (v == null) return "";
      const s = String(v);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const lines = [headers.join(",")];
    for (const row of rows) {
      let title = "";
      let reflection = "";
      let confidence = "";
      if (row.structured_json) {
        try {
          const parsed = JSON.parse(row.structured_json);
          title = parsed?.title || "";
          reflection = parsed?.reflection || "";
          confidence = parsed?.confidence != null ? String(parsed.confidence) : "";
        } catch {}
      }
      lines.push(
        [
          row.id,
          row.filename,
          row.student_id,
          row.student_name,
          row.entry_date,
          row.week_number,
          row.status,
          row.extract_source,
          row.mime_type,
          row.file_size,
          row.word_count,
          row.token_count,
          title,
          reflection,
          confidence,
          row.journal_id,
          row.error_message,
          row.created_at,
          row.updated_at,
        ]
          .map(escape)
          .join(","),
      );
    }

    const bom = "\uFEFF"; // Excel で UTF-8 として開けるように BOM 付与
    const csv = bom + lines.join("\r\n");
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    // 監査ログ: エクスポート件数・形式・絞り込み条件を記録
    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "summary_csv",
      visibleRecordCount: rows.length,
      scopeBasis: user.role === "admin" ? "admin_all" : "uploader_own",
      reason: `summary_csv | filters: status=${status ?? ""},student=${studentId ?? ""},from=${fromDate ?? ""},to=${toDate ?? ""},q=${q ?? ""}`,
    });

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-imports-${ts}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ────────────────────────────────────────────────────────────────
// GET /export.detail.csv - 質的分析向け詳細 CSV
// (時限ブロックを全て列展開 + 抽出原文も含む / 最大 5000 件)
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/export.detail.csv",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const status = c.req.query("status");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    const q = c.req.query("q");

    let sql = `SELECT ji.*, u.name AS student_name
               FROM journal_imports ji
               LEFT JOIN users u ON u.id = ji.student_id
               WHERE 1=1`;
    const params: any[] = [];
    if (user.role !== "admin") {
      sql += ` AND ji.uploaded_by = ?`;
      params.push(user.id);
    }
    if (status) {
      sql += ` AND ji.status = ?`;
      params.push(status);
    }
    if (studentId) {
      sql += ` AND ji.student_id = ?`;
      params.push(studentId);
    }
    if (fromDate) {
      sql += ` AND ji.entry_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      sql += ` AND ji.entry_date <= ?`;
      params.push(toDate);
    }
    if (q) {
      sql += ` AND ji.filename LIKE ?`;
      params.push(`%${q}%`);
    }
    sql += ` ORDER BY ji.student_id, ji.week_number, ji.entry_date LIMIT 5000`;

    const res = await db.prepare(sql).bind(...params).all<any>();
    const rows = res.results || [];

    const headers = [
      "id",
      "filename",
      "student_id",
      "student_name",
      "entry_date",
      "week_number",
      "status",
      "extract_source",
      "mime_type",
      "file_size",
      "word_count",
      "token_count",
      "title",
      ...BLOCK_KEYS,
      "reflection",
      "confidence",
      "notes",
      "raw_text",
      "journal_id",
      "error_message",
      "created_at",
      "updated_at",
    ];

    const lines = [headers.join(",")];
    for (const row of rows) {
      const parsed = safeJsonParse<any>(row.structured_json) || {};
      const blocks = parsed.blocks || {};
      const blockValues = BLOCK_KEYS.map((k) => blocks[k] || "");
      lines.push(
        [
          row.id,
          row.filename,
          row.student_id,
          row.student_name,
          row.entry_date,
          row.week_number,
          row.status,
          row.extract_source,
          row.mime_type,
          row.file_size,
          row.word_count,
          row.token_count,
          parsed.title || "",
          ...blockValues,
          parsed.reflection || "",
          parsed.confidence != null ? String(parsed.confidence) : "",
          parsed.notes || "",
          row.raw_text || "",
          row.journal_id,
          row.error_message,
          row.created_at,
          row.updated_at,
        ]
          .map(csvEscape)
          .join(","),
      );
    }

    const bom = "\uFEFF";
    const csv = bom + lines.join("\r\n");

    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "detail_csv",
      visibleRecordCount: rows.length,
      scopeBasis: user.role === "admin" ? "admin_all" : "uploader_own",
      reason: `detail_csv | filters: status=${status ?? ""},student=${studentId ?? ""},from=${fromDate ?? ""},to=${toDate ?? ""},q=${q ?? ""}`,
    });

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-imports-detail-${csvTimestamp()}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ────────────────────────────────────────────────────────────────
// GET /export.json - 質的分析用 JSON (NVivo / MAXQDA / pandas 向け)
// 全フィールドをネスト構造で出力 / 最大 5000 件
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/export.json",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const status = c.req.query("status");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    const q = c.req.query("q");

    let sql = `SELECT ji.*, u.name AS student_name, u.email AS student_email
               FROM journal_imports ji
               LEFT JOIN users u ON u.id = ji.student_id
               WHERE 1=1`;
    const params: any[] = [];
    if (user.role !== "admin") {
      sql += ` AND ji.uploaded_by = ?`;
      params.push(user.id);
    }
    if (status) {
      sql += ` AND ji.status = ?`;
      params.push(status);
    }
    if (studentId) {
      sql += ` AND ji.student_id = ?`;
      params.push(studentId);
    }
    if (fromDate) {
      sql += ` AND ji.entry_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      sql += ` AND ji.entry_date <= ?`;
      params.push(toDate);
    }
    if (q) {
      sql += ` AND ji.filename LIKE ?`;
      params.push(`%${q}%`);
    }
    sql += ` ORDER BY ji.student_id, ji.week_number, ji.entry_date LIMIT 5000`;

    const res = await db.prepare(sql).bind(...params).all<any>();
    const rows = res.results || [];

    const items = rows.map((row) => {
      const structured = safeJsonParse<any>(row.structured_json) || null;
      return {
        id: row.id,
        filename: row.filename,
        student: row.student_id
          ? {
              id: row.student_id,
              name: row.student_name || null,
              email: row.student_email || null,
            }
          : null,
        entry_date: row.entry_date,
        week_number: row.week_number,
        status: row.status,
        extract: {
          source: row.extract_source,
          mime_type: row.mime_type,
          file_size: row.file_size,
          word_count: row.word_count,
          token_count: row.token_count,
        },
        structured: structured
          ? {
              title: structured.title || null,
              blocks: structured.blocks || {},
              reflection: structured.reflection || null,
              confidence: structured.confidence ?? null,
              notes: structured.notes || null,
            }
          : null,
        raw_text: row.raw_text || null,
        journal_id: row.journal_id,
        error_message: row.error_message,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    const payload = {
      exported_at: new Date().toISOString(),
      exported_by: { id: user.id, role: user.role },
      filters: { status, student_id: studentId, from: fromDate, to: toDate, q },
      block_keys: BLOCK_KEYS,
      count: items.length,
      items,
    };

    const ts = csvTimestamp();

    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "json",
      visibleRecordCount: items.length,
      scopeBasis: user.role === "admin" ? "admin_all" : "uploader_own",
      reason: `json | filters: status=${status ?? ""},student=${studentId ?? ""},from=${fromDate ?? ""},to=${toDate ?? ""},q=${q ?? ""}`,
    });

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-imports-${ts}.json"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ────────────────────────────────────────────────────────────────
// GET /export.analysis.csv - 日誌統合分析エクスポート
// journal_entries + AI評価 + 人間評価 + SCAT概念数 を結合した量的分析テーブル
// 取り込み (journal_imports) からコミット済みのもののみが結合される
// 最大 5000 件
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/export.analysis.csv",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");

    // 1) コア取得: 全 journal_entries (管理者) または 自分が取り込みコミットしたもの (researcher)
    let baseSql: string;
    const baseParams: any[] = [];

    if (user.role === "admin") {
      baseSql = `
        SELECT je.id AS journal_id,
               je.student_id,
               u.name AS student_name,
               je.entry_date,
               je.week_number,
               je.title,
               je.word_count,
               je.status AS journal_status,
               je.ocr_source,
               je.ocr_confidence,
               je.created_at AS journal_created_at,
               ji.id AS import_id,
               ji.filename AS import_filename,
               ji.extract_source AS import_source
        FROM journal_entries je
        LEFT JOIN users u ON u.id = je.student_id
        LEFT JOIN journal_imports ji ON ji.journal_id = je.id
        WHERE 1=1
      `;
    } else {
      // researcher は自分が取り込み確定した分のみ
      baseSql = `
        SELECT je.id AS journal_id,
               je.student_id,
               u.name AS student_name,
               je.entry_date,
               je.week_number,
               je.title,
               je.word_count,
               je.status AS journal_status,
               je.ocr_source,
               je.ocr_confidence,
               je.created_at AS journal_created_at,
               ji.id AS import_id,
               ji.filename AS import_filename,
               ji.extract_source AS import_source
        FROM journal_imports ji
        JOIN journal_entries je ON je.id = ji.journal_id
        LEFT JOIN users u ON u.id = je.student_id
        WHERE ji.uploaded_by = ?
      `;
      baseParams.push(user.id);
    }

    if (studentId) {
      baseSql += ` AND je.student_id = ?`;
      baseParams.push(studentId);
    }
    if (fromDate) {
      baseSql += ` AND je.entry_date >= ?`;
      baseParams.push(fromDate);
    }
    if (toDate) {
      baseSql += ` AND je.entry_date <= ?`;
      baseParams.push(toDate);
    }
    baseSql += ` ORDER BY je.student_id, je.week_number, je.entry_date LIMIT 5000`;

    const baseRes = await db.prepare(baseSql).bind(...baseParams).all<any>();
    const journals = baseRes.results || [];
    const journalIds = journals.map((j) => j.journal_id).filter(Boolean);

    // 2) AI 評価 (最新の1件 / journal_id ごと)
    const aiMap = new Map<string, any>();
    if (journalIds.length > 0) {
      const placeholders = journalIds.map(() => "?").join(",");
      const aiRes = await db
        .prepare(
          `SELECT * FROM evaluations
           WHERE journal_id IN (${placeholders}) AND eval_type='ai'
           ORDER BY created_at DESC`,
        )
        .bind(...journalIds)
        .all<any>();
      for (const ev of aiRes.results || []) {
        if (!aiMap.has(ev.journal_id)) aiMap.set(ev.journal_id, ev);
      }
    }

    // 3) 人間評価 (平均 / journal_id ごと)
    const humanMap = new Map<string, any>();
    if (journalIds.length > 0) {
      const placeholders = journalIds.map(() => "?").join(",");
      const huRes = await db
        .prepare(
          `SELECT journal_id,
                  COUNT(*) AS evaluator_count,
                  AVG(total_score) AS avg_total,
                  AVG(factor1_score) AS avg_f1,
                  AVG(factor2_score) AS avg_f2,
                  AVG(factor3_score) AS avg_f3,
                  AVG(factor4_score) AS avg_f4,
                  AVG(factor5_score) AS avg_f5,
                  AVG(factor6_score) AS avg_f6
           FROM human_evaluations
           WHERE journal_id IN (${placeholders})
           GROUP BY journal_id`,
        )
        .bind(...journalIds)
        .all<any>();
      for (const hu of huRes.results || []) {
        humanMap.set(hu.journal_id, hu);
      }
    }

    // 4) SCAT 概念数 (journal_id を持つ scat_segments → scat_codes step3_concept)
    const scatMap = new Map<string, { segments: number; concepts: number; themes: number }>();
    if (journalIds.length > 0) {
      const placeholders = journalIds.map(() => "?").join(",");
      // セグメント数
      const segRes = await db
        .prepare(
          `SELECT source_journal_id, COUNT(*) AS seg_count
           FROM scat_segments
           WHERE source_journal_id IN (${placeholders})
           GROUP BY source_journal_id`,
        )
        .bind(...journalIds)
        .all<any>();
      for (const s of segRes.results || []) {
        scatMap.set(s.source_journal_id, {
          segments: Number(s.seg_count || 0),
          concepts: 0,
          themes: 0,
        });
      }
      // 概念数 (step3_concept が non-empty) + テーマ数 (step4_theme が non-empty)
      const codeRes = await db
        .prepare(
          `SELECT ss.source_journal_id AS jid,
                  SUM(CASE WHEN sc.step3_concept IS NOT NULL AND sc.step3_concept != '' THEN 1 ELSE 0 END) AS concept_count,
                  SUM(CASE WHEN sc.step4_theme IS NOT NULL AND sc.step4_theme != '' THEN 1 ELSE 0 END) AS theme_count
           FROM scat_codes sc
           JOIN scat_segments ss ON ss.id = sc.segment_id
           WHERE ss.source_journal_id IN (${placeholders})
           GROUP BY ss.source_journal_id`,
        )
        .bind(...journalIds)
        .all<any>();
      for (const cc of codeRes.results || []) {
        const cur = scatMap.get(cc.jid) || { segments: 0, concepts: 0, themes: 0 };
        cur.concepts = Number(cc.concept_count || 0);
        cur.themes = Number(cc.theme_count || 0);
        scatMap.set(cc.jid, cur);
      }
    }

    // 5) 取り込み構造化情報 (block_* と reflection を再パース)
    const importIds = journals.map((j) => j.import_id).filter(Boolean);
    const importMetaMap = new Map<string, any>();
    if (importIds.length > 0) {
      const placeholders = importIds.map(() => "?").join(",");
      const impRes = await db
        .prepare(
          `SELECT id, structured_json, confidence FROM journal_imports
           WHERE id IN (${placeholders})`,
        )
        .bind(...importIds)
        .all<any>();
      for (const imp of impRes.results || []) {
        importMetaMap.set(imp.id, safeJsonParse<any>(imp.structured_json) || {});
      }
    }

    // CSV 構築
    const headers = [
      // 日誌コア
      "journal_id",
      "student_id",
      "student_name",
      "entry_date",
      "week_number",
      "title",
      "word_count",
      "journal_status",
      "ocr_source",
      "ocr_confidence",
      "journal_created_at",
      // 取り込みメタ
      "import_id",
      "import_filename",
      "import_source",
      "import_confidence",
      // ブロック別文字数 (量的分析用)
      ...BLOCK_KEYS.map((k) => `${k}_chars`),
      "reflection_chars",
      // AI 評価
      "ai_total_score",
      "ai_factor1",
      "ai_factor2",
      "ai_factor3",
      "ai_factor4",
      "ai_factor5",
      "ai_factor6",
      "ai_model",
      "ai_prompt_version",
      "ai_halo_detected",
      "ai_token_count",
      // 人間評価 (平均)
      "human_evaluator_count",
      "human_avg_total",
      "human_avg_f1",
      "human_avg_f2",
      "human_avg_f3",
      "human_avg_f4",
      "human_avg_f5",
      "human_avg_f6",
      // AI と 人間 の差分
      "score_diff_total",
      "score_diff_f1",
      "score_diff_f2",
      "score_diff_f3",
      "score_diff_f4",
      "score_diff_f5",
      "score_diff_f6",
      // SCAT
      "scat_segments",
      "scat_concepts",
      "scat_themes",
    ];

    const lines = [headers.join(",")];

    for (const j of journals) {
      const ai = aiMap.get(j.journal_id);
      const hu = humanMap.get(j.journal_id);
      const sc = scatMap.get(j.journal_id) || { segments: 0, concepts: 0, themes: 0 };
      const imp = importMetaMap.get(j.import_id) || {};
      const blocks = imp.blocks || {};

      const blockCharCounts = BLOCK_KEYS.map((k) => {
        const s = blocks[k];
        return s ? String(s).length : 0;
      });
      const reflectionChars = imp.reflection ? String(imp.reflection).length : 0;

      const aiTotal = ai?.total_score;
      const aiF1 = ai?.factor1_score;
      const aiF2 = ai?.factor2_score;
      const aiF3 = ai?.factor3_score;
      const aiF4 = ai?.factor4_score;
      const aiF5 = ai?.factor5_score;
      const aiF6 = ai?.factor6_score;
      const huTotal = hu?.avg_total;
      const huF1 = hu?.avg_f1;
      const huF2 = hu?.avg_f2;
      const huF3 = hu?.avg_f3;
      const huF4 = hu?.avg_f4;
      const huF5 = hu?.avg_f5;
      const huF6 = hu?.avg_f6;

      const diff = (a: any, b: any) =>
        a != null && b != null ? Number(a) - Number(b) : "";

      lines.push(
        [
          j.journal_id,
          j.student_id,
          j.student_name,
          j.entry_date,
          j.week_number,
          j.title,
          j.word_count,
          j.journal_status,
          j.ocr_source,
          j.ocr_confidence,
          j.journal_created_at,
          j.import_id,
          j.import_filename,
          j.import_source,
          imp.confidence ?? "",
          ...blockCharCounts,
          reflectionChars,
          aiTotal ?? "",
          aiF1 ?? "",
          aiF2 ?? "",
          aiF3 ?? "",
          aiF4 ?? "",
          aiF5 ?? "",
          aiF6 ?? "",
          ai?.model_name ?? "",
          ai?.prompt_version ?? "",
          ai?.halo_effect_detected ?? "",
          ai?.token_count ?? "",
          hu?.evaluator_count ?? "",
          huTotal ?? "",
          huF1 ?? "",
          huF2 ?? "",
          huF3 ?? "",
          huF4 ?? "",
          huF5 ?? "",
          huF6 ?? "",
          diff(aiTotal, huTotal),
          diff(aiF1, huF1),
          diff(aiF2, huF2),
          diff(aiF3, huF3),
          diff(aiF4, huF4),
          diff(aiF5, huF5),
          diff(aiF6, huF6),
          sc.segments,
          sc.concepts,
          sc.themes,
        ]
          .map(csvEscape)
          .join(","),
      );
    }

    const bom = "\uFEFF";
    const csv = bom + lines.join("\r\n");

    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "analysis_csv",
      visibleRecordCount: lines.length - 1, // header を除く
      scopeBasis: user.role === "admin" ? "admin_all" : "uploader_own",
      reason: `analysis_csv | filters: student=${studentId ?? ""},from=${fromDate ?? ""},to=${toDate ?? ""}`,
    });

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-analysis-${csvTimestamp()}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ────────────────────────────────────────────────────────────────
// データ辞書 (codebook) - 各エクスポート CSV/JSON の列定義を提供
// 論文化・倫理審査・追跡可能性のために、列の意味・型・由来テーブルを記述
// ────────────────────────────────────────────────────────────────
type CodebookField = {
  name: string;
  type: "string" | "integer" | "number" | "boolean" | "datetime" | "date" | "enum" | "object" | "array";
  description: string;
  source: string;          // 由来 (テーブル.列 or 計算式)
  unit?: string;           // 単位 (chars, score など)
  enum_values?: string[];  // type=enum の場合の取りうる値
  nullable?: boolean;
  notes?: string;
};

type CodebookSection = {
  format:
    | "summary_csv"
    | "detail_csv"
    | "json"
    | "analysis_csv"
    | "descriptive_stats_md"
    | "correlation_csv"
    | "t_test_md"
    | "methods_section_md";
  endpoint: string;
  description: string;
  fields: CodebookField[];
  filters: { name: string; type: string; description: string }[];
  row_limit: number;
};

function buildCodebook(): {
  generated_at: string;
  version: string;
  description: string;
  block_keys: string[];
  sections: CodebookSection[];
} {
  const blockFields = (suffix = "", note?: string): CodebookField[] =>
    BLOCK_KEYS.map((k) => ({
      name: suffix ? `${k}${suffix}` : k,
      type: suffix === "_chars" ? "integer" : ("string" as const),
      description:
        k === "block_morning" ? "朝の活動の記述" :
        k === "block_p1" ? "1時限目の記述" :
        k === "block_p2" ? "2時限目の記述" :
        k === "block_p3" ? "3時限目の記述" :
        k === "block_p4" ? "4時限目の記述" :
        k === "block_lunch" ? "給食・昼休みの記述" :
        k === "block_p5" ? "5時限目の記述" :
        k === "block_p6" ? "6時限目の記述" :
        k === "block_cleaning" ? "清掃時間の記述" :
        k === "block_closing" ? "終学活/帰りの会の記述" :
        "放課後の記述",
      source: `journal_imports.structured_json.blocks.${k}${suffix === "_chars" ? " (文字数)" : ""}`,
      unit: suffix === "_chars" ? "chars" : undefined,
      nullable: true,
      notes: note,
    }));

  const summary: CodebookSection = {
    format: "summary_csv",
    endpoint: "GET /api/data/journal-imports/export.csv",
    description: "取り込み一覧の基本メタ情報 (19 列)。日誌本文や時限ブロックは含まれない。一覧確認・進捗追跡向け。",
    row_limit: 5000,
    filters: [
      { name: "status", type: "enum", description: "pending|extracting|extracted|structured|committed|failed" },
      { name: "student_id", type: "string", description: "学生 ID で絞り込み" },
      { name: "from", type: "date", description: "entry_date >= YYYY-MM-DD" },
      { name: "to", type: "date", description: "entry_date <= YYYY-MM-DD" },
      { name: "q", type: "string", description: "filename 部分一致 (LIKE %q%)" },
    ],
    fields: [
      { name: "id", type: "string", description: "取り込み ID (UUID)", source: "journal_imports.id" },
      { name: "filename", type: "string", description: "アップロードされたファイル名", source: "journal_imports.filename" },
      { name: "student_id", type: "string", description: "学生 ID", source: "journal_imports.student_id", nullable: true },
      { name: "student_name", type: "string", description: "学生氏名", source: "users.name (JOIN)", nullable: true },
      { name: "entry_date", type: "date", description: "実習日", source: "journal_imports.entry_date", nullable: true },
      { name: "week_number", type: "integer", description: "実習週 (1-N)", source: "journal_imports.week_number", nullable: true },
      { name: "status", type: "enum", description: "取り込みステータス", source: "journal_imports.status", enum_values: ["pending", "extracting", "extracted", "structured", "committed", "failed"] },
      { name: "extract_source", type: "enum", description: "テキスト抽出に使われた手段", source: "journal_imports.extract_source", enum_values: ["to_markdown", "gcv_ocr", "raw_text"], nullable: true },
      { name: "mime_type", type: "string", description: "アップロードファイルの MIME", source: "journal_imports.mime_type" },
      { name: "file_size", type: "integer", description: "ファイルサイズ", source: "journal_imports.file_size", unit: "bytes" },
      { name: "word_count", type: "integer", description: "抽出後の語数推定", source: "journal_imports.word_count", nullable: true },
      { name: "token_count", type: "integer", description: "GPT-4 構造化に使ったトークン数", source: "journal_imports.token_count", nullable: true },
      { name: "title", type: "string", description: "構造化後のタイトル", source: "structured_json.title", nullable: true },
      { name: "reflection", type: "string", description: "省察パートのテキスト", source: "structured_json.reflection", nullable: true },
      { name: "confidence", type: "number", description: "構造化の信頼度 (0-1)", source: "structured_json.confidence", nullable: true },
      { name: "journal_id", type: "string", description: "コミット後の journal_entries.id", source: "journal_imports.journal_id", nullable: true, notes: "status=committed の時のみ非NULL" },
      { name: "error_message", type: "string", description: "失敗時のエラーメッセージ", source: "journal_imports.error_message", nullable: true },
      { name: "created_at", type: "datetime", description: "取り込み作成日時 (UTC)", source: "journal_imports.created_at" },
      { name: "updated_at", type: "datetime", description: "取り込み更新日時 (UTC)", source: "journal_imports.updated_at" },
    ],
  };

  const detail: CodebookSection = {
    format: "detail_csv",
    endpoint: "GET /api/data/journal-imports/export.detail.csv",
    description: "質的分析向け詳細 CSV (32 列)。時限ブロックを 11 列に展開 + 抽出原文 (raw_text) を含む。NVivo / MAXQDA / pandas でのコーディング作業を想定。",
    row_limit: 5000,
    filters: summary.filters,
    fields: [
      ...summary.fields.slice(0, 13).filter((f) => f.name !== "reflection" && f.name !== "confidence" && f.name !== "journal_id" && f.name !== "error_message" && f.name !== "created_at" && f.name !== "updated_at"),
      ...blockFields("", "時限ブロックの本文。構造化失敗の場合は空文字。"),
      { name: "reflection", type: "string", description: "省察パートの本文", source: "structured_json.reflection", nullable: true },
      { name: "confidence", type: "number", description: "構造化信頼度 (0-1)", source: "structured_json.confidence", nullable: true },
      { name: "notes", type: "string", description: "備考欄", source: "structured_json.notes", nullable: true },
      { name: "raw_text", type: "string", description: "抽出された生テキスト全文 (toMarkdown または OCR の出力)", source: "journal_imports.raw_text", nullable: true, notes: "質的コーディングの 1 次資料" },
      { name: "journal_id", type: "string", description: "コミット後の journal_entries.id", source: "journal_imports.journal_id", nullable: true },
      { name: "error_message", type: "string", description: "失敗時メッセージ", source: "journal_imports.error_message", nullable: true },
      { name: "created_at", type: "datetime", description: "作成日時", source: "journal_imports.created_at" },
      { name: "updated_at", type: "datetime", description: "更新日時", source: "journal_imports.updated_at" },
    ],
  };

  const json: CodebookSection = {
    format: "json",
    endpoint: "GET /api/data/journal-imports/export.json",
    description: "質的分析向けネスト構造 JSON。NVivo / MAXQDA / Python pandas へのインポートを想定。ファイル名・絞り込み条件・エクスポート実施者などのメタ情報を payload 直下に持つ。",
    row_limit: 5000,
    filters: summary.filters,
    fields: [
      { name: "exported_at", type: "datetime", description: "エクスポート実施日時 (ISO 8601 UTC)", source: "サーバー時刻" },
      { name: "exported_by", type: "object", description: "実施者 { id, role }", source: "認証ユーザー" },
      { name: "filters", type: "object", description: "リクエスト時に指定された絞り込み", source: "クエリパラメータ" },
      { name: "block_keys", type: "array", description: "時限ブロックキーの順序付き配列 (11 個)", source: "BLOCK_KEYS 定数" },
      { name: "count", type: "integer", description: "items 配列の長さ", source: "計算" },
      { name: "items[].id", type: "string", description: "取り込み ID", source: "journal_imports.id" },
      { name: "items[].filename", type: "string", description: "ファイル名", source: "journal_imports.filename" },
      { name: "items[].student", type: "object", description: "{ id, name, email } または null", source: "users JOIN", nullable: true },
      { name: "items[].entry_date", type: "date", description: "実習日", source: "journal_imports.entry_date", nullable: true },
      { name: "items[].week_number", type: "integer", description: "実習週", source: "journal_imports.week_number", nullable: true },
      { name: "items[].status", type: "enum", description: "ステータス", source: "journal_imports.status" },
      { name: "items[].extract", type: "object", description: "{ source, mime_type, file_size, word_count, token_count }", source: "journal_imports 抽出情報" },
      { name: "items[].structured", type: "object", description: "{ title, blocks{}, reflection, confidence, notes } または null", source: "structured_json", nullable: true },
      { name: "items[].raw_text", type: "string", description: "抽出生テキスト", source: "journal_imports.raw_text", nullable: true },
      { name: "items[].journal_id", type: "string", description: "コミット後 journal_entries.id", source: "journal_imports.journal_id", nullable: true },
      { name: "items[].error_message", type: "string", description: "失敗時メッセージ", source: "journal_imports.error_message", nullable: true },
      { name: "items[].created_at", type: "datetime", description: "作成日時", source: "journal_imports.created_at" },
      { name: "items[].updated_at", type: "datetime", description: "更新日時", source: "journal_imports.updated_at" },
    ],
  };

  const analysis: CodebookSection = {
    format: "analysis_csv",
    endpoint: "GET /api/data/journal-imports/export.analysis.csv",
    description: "量的分析向け統合 CSV (55 列)。journal_entries + AI 評価 + 人間評価 (平均) + SCAT 概念数 を結合。score_diff_* 列は AI 値 - 人間平均 で事前計算済み。R / SPSS / Python statsmodels での t 検定 / ANOVA / 相関分析を想定。コミット済み日誌のみが対象 (status='committed')。",
    row_limit: 5000,
    filters: [
      { name: "student_id", type: "string", description: "学生 ID 絞り込み" },
      { name: "from", type: "date", description: "entry_date >= YYYY-MM-DD" },
      { name: "to", type: "date", description: "entry_date <= YYYY-MM-DD" },
    ],
    fields: [
      // 日誌コア
      { name: "journal_id", type: "string", description: "日誌 ID (主キー)", source: "journal_entries.id" },
      { name: "student_id", type: "string", description: "学生 ID", source: "journal_entries.student_id" },
      { name: "student_name", type: "string", description: "学生氏名", source: "users.name", nullable: true },
      { name: "entry_date", type: "date", description: "実習日", source: "journal_entries.entry_date" },
      { name: "week_number", type: "integer", description: "実習週", source: "journal_entries.week_number" },
      { name: "title", type: "string", description: "日誌タイトル", source: "journal_entries.title", nullable: true },
      { name: "word_count", type: "integer", description: "日誌本文の語数", source: "journal_entries.word_count", unit: "words", nullable: true },
      { name: "journal_status", type: "enum", description: "日誌のステータス", source: "journal_entries.status" },
      { name: "ocr_source", type: "string", description: "OCR ソース", source: "journal_entries.ocr_source", nullable: true },
      { name: "ocr_confidence", type: "number", description: "OCR 信頼度 (0-1)", source: "journal_entries.ocr_confidence", nullable: true },
      { name: "journal_created_at", type: "datetime", description: "日誌作成日時", source: "journal_entries.created_at" },
      // 取り込みメタ
      { name: "import_id", type: "string", description: "取り込み ID", source: "journal_imports.id", nullable: true },
      { name: "import_filename", type: "string", description: "取り込み元ファイル名", source: "journal_imports.filename", nullable: true },
      { name: "import_source", type: "string", description: "テキスト抽出方法", source: "journal_imports.extract_source", nullable: true },
      { name: "import_confidence", type: "number", description: "構造化信頼度 (0-1)", source: "structured_json.confidence", nullable: true },
      // 時限ブロック (文字数)
      ...blockFields("_chars", "時限ブロックの文字数 (構造化済み本文の長さ)"),
      { name: "reflection_chars", type: "integer", description: "省察パートの文字数", source: "structured_json.reflection (文字数)", unit: "chars" },
      // AI 評価
      { name: "ai_total_score", type: "number", description: "AI 評価の合計スコア", source: "evaluations.total_score (eval_type='ai')", nullable: true },
      { name: "ai_factor1", type: "number", description: "AI 評価 因子1", source: "evaluations.factor1_score", nullable: true },
      { name: "ai_factor2", type: "number", description: "AI 評価 因子2", source: "evaluations.factor2_score", nullable: true },
      { name: "ai_factor3", type: "number", description: "AI 評価 因子3", source: "evaluations.factor3_score", nullable: true },
      { name: "ai_factor4", type: "number", description: "AI 評価 因子4", source: "evaluations.factor4_score", nullable: true },
      { name: "ai_factor5", type: "number", description: "AI 評価 因子5", source: "evaluations.factor5_score", nullable: true },
      { name: "ai_factor6", type: "number", description: "AI 評価 因子6", source: "evaluations.factor6_score", nullable: true },
      { name: "ai_model", type: "string", description: "使用 AI モデル名", source: "evaluations.model", nullable: true },
      { name: "ai_prompt_version", type: "string", description: "プロンプトバージョン", source: "evaluations.prompt_version", nullable: true },
      { name: "ai_halo_detected", type: "boolean", description: "ハロー効果が検出されたか", source: "evaluations.halo_detected", nullable: true },
      { name: "ai_token_count", type: "integer", description: "AI 評価で使ったトークン数", source: "evaluations.token_count", unit: "tokens", nullable: true },
      // 人間評価 (平均)
      { name: "human_evaluator_count", type: "integer", description: "評価者数", source: "COUNT(human_evaluations.id)" },
      { name: "human_avg_total", type: "number", description: "人間評価の平均合計スコア", source: "AVG(human_evaluations.total_score)", nullable: true },
      { name: "human_avg_f1", type: "number", description: "人間評価 因子1 平均", source: "AVG(human_evaluations.factor1_score)", nullable: true },
      { name: "human_avg_f2", type: "number", description: "人間評価 因子2 平均", source: "AVG(human_evaluations.factor2_score)", nullable: true },
      { name: "human_avg_f3", type: "number", description: "人間評価 因子3 平均", source: "AVG(human_evaluations.factor3_score)", nullable: true },
      { name: "human_avg_f4", type: "number", description: "人間評価 因子4 平均", source: "AVG(human_evaluations.factor4_score)", nullable: true },
      { name: "human_avg_f5", type: "number", description: "人間評価 因子5 平均", source: "AVG(human_evaluations.factor5_score)", nullable: true },
      { name: "human_avg_f6", type: "number", description: "人間評価 因子6 平均", source: "AVG(human_evaluations.factor6_score)", nullable: true },
      // AI - 人間 の差分
      { name: "score_diff_total", type: "number", description: "ai_total_score - human_avg_total", source: "サーバ計算", nullable: true, notes: "正値: AI が高評価、負値: 人間が高評価" },
      { name: "score_diff_f1", type: "number", description: "ai_factor1 - human_avg_f1", source: "サーバ計算", nullable: true },
      { name: "score_diff_f2", type: "number", description: "ai_factor2 - human_avg_f2", source: "サーバ計算", nullable: true },
      { name: "score_diff_f3", type: "number", description: "ai_factor3 - human_avg_f3", source: "サーバ計算", nullable: true },
      { name: "score_diff_f4", type: "number", description: "ai_factor4 - human_avg_f4", source: "サーバ計算", nullable: true },
      { name: "score_diff_f5", type: "number", description: "ai_factor5 - human_avg_f5", source: "サーバ計算", nullable: true },
      { name: "score_diff_f6", type: "number", description: "ai_factor6 - human_avg_f6", source: "サーバ計算", nullable: true },
      // SCAT
      { name: "scat_segments", type: "integer", description: "SCAT セグメント数 (この日誌から切り出された質的データ単位)", source: "COUNT(scat_segments WHERE source_journal_id=journal_id)" },
      { name: "scat_concepts", type: "integer", description: "SCAT step3 概念の数 (step3_concept != '')", source: "COUNT(scat_codes step3_concept)" },
      { name: "scat_themes", type: "integer", description: "SCAT step4 テーマの数 (step4_theme != '')", source: "COUNT(scat_codes step4_theme)" },
    ],
  };

  // ────────────────────────────────────────────────────────────────
  // Phase 6-3 セクション: 統計集計エクスポート (APA 論文出力支援)
  // ────────────────────────────────────────────────────────────────
  const analysisFilters = [
    { name: "student_id", type: "string", description: "学生 ID 絞り込み" },
    { name: "from", type: "date", description: "entry_date >= YYYY-MM-DD" },
    { name: "to", type: "date", description: "entry_date <= YYYY-MM-DD" },
  ];

  const descriptiveStats: CodebookSection = {
    format: "descriptive_stats_md",
    endpoint: "GET /api/data/journal-imports/export.descriptive_stats.md",
    description: "APA 7th edition 形式の記述統計テーブル (Markdown)。AI 評価 / 人間評価 / SCAT 概念数 / 日誌記述量 の各変数について、平均・SD・中央値・最小最大・歪度・尖度 を計算。論文 Results セクションにコピペ可能。",
    row_limit: 5000,
    filters: analysisFilters,
    fields: [
      { name: "n", type: "integer", description: "有効サンプル数 (欠損除外後)", source: "計算" },
      { name: "M", type: "number", description: "標本平均", source: "計算" },
      { name: "SD", type: "number", description: "不偏標準偏差 (分母 n−1)", source: "計算" },
      { name: "Mdn", type: "number", description: "中央値", source: "計算" },
      { name: "Min", type: "number", description: "最小値", source: "計算" },
      { name: "Max", type: "number", description: "最大値", source: "計算" },
      { name: "Skewness", type: "number", description: "Fisher-Pearson 標本歪度 (g₁)", source: "計算", notes: "SciPy bias=False 相当" },
      { name: "Kurtosis", type: "number", description: "超過尖度 (g₂; 正規分布で 0)", source: "計算", notes: "SciPy bias=False 相当" },
    ],
  };

  const correlation: CodebookSection = {
    format: "correlation_csv",
    endpoint: "GET /api/data/journal-imports/export.correlation.csv",
    description: "Pearson 積率相関の総当たり相関 (AI/人間/SCAT/語数 14 変数のペアワイズ)。各ペアに対し n, r, t, df, p, 有意性記号 (***/**/*), Fisher z 変換による 95% 信頼区間 を出力。R / SPSS / Python での再現用 CSV。",
    row_limit: 5000,
    filters: analysisFilters,
    fields: [
      { name: "variable_1", type: "string", description: "変数1 ラベル", source: "計算" },
      { name: "variable_2", type: "string", description: "変数2 ラベル", source: "計算" },
      { name: "n", type: "integer", description: "有効ペア数", source: "計算" },
      { name: "r", type: "number", description: "Pearson 相関係数 (−1〜1)", source: "計算" },
      { name: "t", type: "number", description: "相関の有意性検定 t 統計量 = r√((n−2)/(1−r²))", source: "計算" },
      { name: "df", type: "integer", description: "自由度 = n − 2", source: "計算" },
      { name: "p", type: "number", description: "両側 p 値 (Student t 分布)", source: "計算" },
      { name: "p_sig", type: "string", description: "有意性記号 ('***' p<.001, '**' p<.01, '*' p<.05, '' n.s.)", source: "計算" },
      { name: "ci_lower_95", type: "number", description: "Fisher z 変換 95% 信頼区間 下限", source: "計算" },
      { name: "ci_upper_95", type: "number", description: "Fisher z 変換 95% 信頼区間 上限", source: "計算" },
    ],
  };

  const tTest: CodebookSection = {
    format: "t_test_md",
    endpoint: "GET /api/data/journal-imports/export.t_test.md",
    description: "群間比較の t 検定結果 (Markdown)。表1: 実習前半 vs 後半 (Welch 独立 t 検定 / split_week パラメータで境界変更可)。表2: AI vs 人間 (対応のある t 検定)。効果量 (Cohen's d / dz) 付き。",
    row_limit: 5000,
    filters: [
      ...analysisFilters,
      { name: "split_week", type: "integer", description: "前半/後半の境界 (week_number ≤ split_week が前半; デフォルト 2)" },
    ],
    fields: [
      { name: "n₁ / n₂", type: "integer", description: "各群の有効サンプル数", source: "計算" },
      { name: "M₁ (SD₁) / M₂ (SD₂)", type: "string", description: "各群の平均と SD", source: "計算" },
      { name: "M差", type: "number", description: "Welch では M₁−M₂、Paired では平均差 (AI−人間)", source: "計算" },
      { name: "t", type: "number", description: "t 統計量", source: "計算" },
      { name: "df", type: "number", description: "Welch: Welch-Satterthwaite 近似自由度、Paired: n−1", source: "計算" },
      { name: "p", type: "number", description: "両側 p 値 (APA 形式: p < .001 など)", source: "計算" },
      { name: "Cohen's d / dz", type: "number", description: "効果量 (d: プール SD で標準化、dz: 差分の SD で標準化)", source: "計算" },
    ],
  };

  const methodsSection: CodebookSection = {
    format: "methods_section_md",
    endpoint: "GET /api/data/journal-imports/export.methods_section.md",
    description: "論文 Methods セクションの自動生成下書き (Markdown)。Participants / Materials / AI Evaluation / Statistical Analysis / Software and Tools / Ethical Considerations / References の 7 サブセクションを含む。エクスポート時点のサンプルサイズ等を埋め込み済み。",
    row_limit: 5000,
    filters: analysisFilters,
    fields: [
      { name: "Participants and Data", type: "string", description: "対象 N、学生数、実習週範囲、語数記述統計、AI/人間/SCAT データ被覆数を本文に展開", source: "計算" },
      { name: "Materials and Instruments", type: "string", description: "評価ルーブリック (6 因子40項目 / 0–5 リッカート) と SCAT 質的分析手法を記述", source: "テンプレート" },
      { name: "AI Evaluation", type: "string", description: "LLM 評価の方法とプロンプトバージョン管理について記述", source: "テンプレート" },
      { name: "Statistical Analysis", type: "string", description: "記述統計・群間比較・相関・効果量・APA 報告形式について記述", source: "テンプレート" },
      { name: "Software and Tools", type: "string", description: "本プラットフォームの技術スタック、統計計算実装の出典 (Numerical Recipes 6.4) を記述", source: "テンプレート" },
      { name: "Ethical Considerations", type: "string", description: "同意、匿名化、RBAC、監査ログを記述", source: "テンプレート" },
      { name: "References", type: "string", description: "推奨引用形式 (大谷 2008 SCAT、APA Publication Manual、Numerical Recipes)", source: "テンプレート" },
    ],
  };

  return {
    generated_at: new Date().toISOString(),
    version: "1.1",
    description: "教育実習日誌 評価プラットフォーム / 過去日誌取り込み機能のエクスポート列定義。論文 Appendix / IRB 提出資料 / 共同研究者へのデータ受け渡しにそのまま使えます。Phase 6-3 (v1.1) で APA 統計エクスポート 4 種を追加。",
    block_keys: BLOCK_KEYS,
    sections: [summary, detail, json, analysis, descriptiveStats, correlation, tTest, methodsSection],
  };
}

// GET /export.codebook.json - データ辞書 (機械可読 / JSON Schema 互換的構造)
journalImportsRouter.get(
  "/export.codebook.json",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const cb = buildCodebook();

    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "codebook_json",
      visibleRecordCount: cb.sections.reduce((s, sec) => s + sec.fields.length, 0),
      scopeBasis: "public_metadata",
      reason: "codebook_json",
    });

    return new Response(JSON.stringify(cb, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-imports-codebook-${csvTimestamp()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// GET /export.codebook.md - データ辞書 (Markdown / 論文 Appendix にそのまま貼れる形式)
journalImportsRouter.get(
  "/export.codebook.md",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const cb = buildCodebook();
    const lines: string[] = [];
    lines.push(`# 教育実習日誌取り込み エクスポート データ辞書 (Codebook)`);
    lines.push("");
    lines.push(`- **バージョン**: ${cb.version}`);
    lines.push(`- **生成日時**: ${cb.generated_at}`);
    lines.push("");
    lines.push(cb.description);
    lines.push("");
    lines.push(`## 時限ブロックキー一覧 (BLOCK_KEYS, n=${cb.block_keys.length})`);
    lines.push("");
    lines.push(cb.block_keys.map((k) => `\`${k}\``).join(", "));
    lines.push("");

    for (const sec of cb.sections) {
      lines.push(`---`);
      lines.push("");
      lines.push(`## ${sec.format.toUpperCase()} — ${sec.endpoint}`);
      lines.push("");
      lines.push(sec.description);
      lines.push("");
      lines.push(`- **行数上限**: ${sec.row_limit}`);
      lines.push("");
      if (sec.filters.length > 0) {
        lines.push(`### フィルタ`);
        lines.push("");
        lines.push("| 名称 | 型 | 説明 |");
        lines.push("|---|---|---|");
        for (const f of sec.filters) {
          lines.push(`| \`${f.name}\` | ${f.type} | ${f.description} |`);
        }
        lines.push("");
      }
      lines.push(`### フィールド定義 (n=${sec.fields.length})`);
      lines.push("");
      lines.push("| 列名 | 型 | 由来 | 説明 | 単位 | NULL可 | 備考 |");
      lines.push("|---|---|---|---|---|---|---|");
      for (const f of sec.fields) {
        lines.push(
          `| \`${f.name}\` | ${f.type}${f.enum_values ? ` (${f.enum_values.join("\\|")})` : ""} | ${f.source} | ${f.description} | ${f.unit ?? "-"} | ${f.nullable ? "○" : "-"} | ${f.notes ?? "-"} |`,
        );
      }
      lines.push("");
    }

    lines.push(`---`);
    lines.push("");
    lines.push(`## 引用について`);
    lines.push("");
    lines.push("本プラットフォームから出力されたデータを研究で使用される際は、エクスポート時の codebook (本ファイル) と監査ログを保存してください。再現可能性 (reproducibility) のため、`exported_at` と `filters` を論文 Methods に記載することを推奨します。");
    lines.push("");

    const md = lines.join("\n");

    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "codebook_md",
      visibleRecordCount: cb.sections.reduce((s, sec) => s + sec.fields.length, 0),
      scopeBasis: "public_metadata",
      reason: "codebook_md",
    });

    return new Response(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-imports-codebook-${csvTimestamp()}.md"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ════════════════════════════════════════════════════════════════
// Phase 6-3: 論文出力支援 (APA 統計テーブル / 相関 / t 検定 / Methods 自動生成)
// 共通ヘルパー: analysis.csv と同じ結合クエリで AI/Human/SCAT 等のデータ配列を返す
// ════════════════════════════════════════════════════════════════
type AnalysisDatum = {
  journal_id: string;
  student_id: string | null;
  entry_date: string | null;
  week_number: number | null;
  word_count: number | null;
  ai_total: number | null;
  ai_f1: number | null;
  ai_f2: number | null;
  ai_f3: number | null;
  ai_f4: number | null;
  ai_f5: number | null;
  ai_f6: number | null;
  hu_total: number | null;
  hu_f1: number | null;
  hu_f2: number | null;
  hu_f3: number | null;
  hu_f4: number | null;
  hu_f5: number | null;
  hu_f6: number | null;
  scat_segments: number;
  scat_concepts: number;
  scat_themes: number;
  reflection_chars: number;
  block_chars_total: number;
};

async function gatherAnalysisData(
  db: D1Database,
  user: { id: string; role: string },
  filters: { studentId?: string; fromDate?: string; toDate?: string },
): Promise<AnalysisDatum[]> {
  let baseSql: string;
  const baseParams: any[] = [];

  if (user.role === "admin") {
    baseSql = `
      SELECT je.id AS journal_id,
             je.student_id,
             je.entry_date,
             je.week_number,
             je.word_count,
             ji.id AS import_id
      FROM journal_entries je
      LEFT JOIN journal_imports ji ON ji.journal_id = je.id
      WHERE 1=1
    `;
  } else {
    baseSql = `
      SELECT je.id AS journal_id,
             je.student_id,
             je.entry_date,
             je.week_number,
             je.word_count,
             ji.id AS import_id
      FROM journal_imports ji
      JOIN journal_entries je ON je.id = ji.journal_id
      WHERE ji.uploaded_by = ?
    `;
    baseParams.push(user.id);
  }
  if (filters.studentId) {
    baseSql += ` AND je.student_id = ?`;
    baseParams.push(filters.studentId);
  }
  if (filters.fromDate) {
    baseSql += ` AND je.entry_date >= ?`;
    baseParams.push(filters.fromDate);
  }
  if (filters.toDate) {
    baseSql += ` AND je.entry_date <= ?`;
    baseParams.push(filters.toDate);
  }
  baseSql += ` ORDER BY je.student_id, je.week_number, je.entry_date LIMIT 5000`;

  const baseRes = await db.prepare(baseSql).bind(...baseParams).all<any>();
  const journals = baseRes.results || [];
  const journalIds = journals.map((j) => j.journal_id).filter(Boolean);

  const aiMap = new Map<string, any>();
  const humanMap = new Map<string, any>();
  const scatMap = new Map<string, { segments: number; concepts: number; themes: number }>();
  const importMetaMap = new Map<string, any>();

  if (journalIds.length > 0) {
    const placeholders = journalIds.map(() => "?").join(",");
    const aiRes = await db
      .prepare(
        `SELECT * FROM evaluations WHERE journal_id IN (${placeholders}) AND eval_type='ai' ORDER BY created_at DESC`,
      )
      .bind(...journalIds)
      .all<any>();
    for (const ev of aiRes.results || []) {
      if (!aiMap.has(ev.journal_id)) aiMap.set(ev.journal_id, ev);
    }
    const huRes = await db
      .prepare(
        `SELECT journal_id, COUNT(*) AS evaluator_count,
                AVG(total_score) AS avg_total,
                AVG(factor1_score) AS avg_f1,
                AVG(factor2_score) AS avg_f2,
                AVG(factor3_score) AS avg_f3,
                AVG(factor4_score) AS avg_f4,
                AVG(factor5_score) AS avg_f5,
                AVG(factor6_score) AS avg_f6
         FROM human_evaluations WHERE journal_id IN (${placeholders})
         GROUP BY journal_id`,
      )
      .bind(...journalIds)
      .all<any>();
    for (const hu of huRes.results || []) humanMap.set(hu.journal_id, hu);

    const segRes = await db
      .prepare(
        `SELECT source_journal_id, COUNT(*) AS seg_count FROM scat_segments
         WHERE source_journal_id IN (${placeholders}) GROUP BY source_journal_id`,
      )
      .bind(...journalIds)
      .all<any>();
    for (const s of segRes.results || []) {
      scatMap.set(s.source_journal_id, { segments: Number(s.seg_count || 0), concepts: 0, themes: 0 });
    }
    const codeRes = await db
      .prepare(
        `SELECT ss.source_journal_id AS jid,
                SUM(CASE WHEN sc.step3_concept IS NOT NULL AND sc.step3_concept != '' THEN 1 ELSE 0 END) AS concept_count,
                SUM(CASE WHEN sc.step4_theme IS NOT NULL AND sc.step4_theme != '' THEN 1 ELSE 0 END) AS theme_count
         FROM scat_codes sc
         JOIN scat_segments ss ON ss.id = sc.segment_id
         WHERE ss.source_journal_id IN (${placeholders})
         GROUP BY ss.source_journal_id`,
      )
      .bind(...journalIds)
      .all<any>();
    for (const cc of codeRes.results || []) {
      const cur = scatMap.get(cc.jid) || { segments: 0, concepts: 0, themes: 0 };
      cur.concepts = Number(cc.concept_count || 0);
      cur.themes = Number(cc.theme_count || 0);
      scatMap.set(cc.jid, cur);
    }

    const importIds = journals.map((j) => j.import_id).filter(Boolean);
    if (importIds.length > 0) {
      const impPh = importIds.map(() => "?").join(",");
      const impRes = await db
        .prepare(`SELECT id, structured_json FROM journal_imports WHERE id IN (${impPh})`)
        .bind(...importIds)
        .all<any>();
      for (const imp of impRes.results || []) {
        importMetaMap.set(imp.id, safeJsonParse<any>(imp.structured_json) || {});
      }
    }
  }

  const data: AnalysisDatum[] = journals.map((j) => {
    const ai = aiMap.get(j.journal_id);
    const hu = humanMap.get(j.journal_id);
    const sc = scatMap.get(j.journal_id) || { segments: 0, concepts: 0, themes: 0 };
    const imp = importMetaMap.get(j.import_id) || {};
    const blocks = imp.blocks || {};
    const blockCharsTotal = BLOCK_KEYS.reduce((acc, k) => {
      const s = blocks[k];
      return acc + (s ? String(s).length : 0);
    }, 0);
    const reflectionChars = imp.reflection ? String(imp.reflection).length : 0;
    const num = (v: any): number | null => (v == null ? null : Number(v));
    return {
      journal_id: j.journal_id,
      student_id: j.student_id ?? null,
      entry_date: j.entry_date ?? null,
      week_number: j.week_number != null ? Number(j.week_number) : null,
      word_count: j.word_count != null ? Number(j.word_count) : null,
      ai_total: num(ai?.total_score),
      ai_f1: num(ai?.factor1_score),
      ai_f2: num(ai?.factor2_score),
      ai_f3: num(ai?.factor3_score),
      ai_f4: num(ai?.factor4_score),
      ai_f5: num(ai?.factor5_score),
      ai_f6: num(ai?.factor6_score),
      hu_total: num(hu?.avg_total),
      hu_f1: num(hu?.avg_f1),
      hu_f2: num(hu?.avg_f2),
      hu_f3: num(hu?.avg_f3),
      hu_f4: num(hu?.avg_f4),
      hu_f5: num(hu?.avg_f5),
      hu_f6: num(hu?.avg_f6),
      scat_segments: sc.segments,
      scat_concepts: sc.concepts,
      scat_themes: sc.themes,
      reflection_chars: reflectionChars,
      block_chars_total: blockCharsTotal,
    };
  });
  return data;
}

// APA 形式の記述統計行 (Markdown テーブル 1 行) を生成
// Phase 7-3: SD/skewness/kurtosis が null の場合は備考列に skip 理由を表示
function apaDescRow(label: string, d: DescriptiveStats): string {
  const note = d.skipped ? formatSkipReason(d.skip_reason) : "";
  return `| ${label} | ${d.n} | ${fmt(d.mean)} | ${fmtCell(d.sd, d)} | ${fmt(d.median)} | ${fmt(d.min)} | ${fmt(d.max)} | ${fmtCell(d.skewness, d)} | ${fmtCell(d.kurtosis, d)} | ${note} |`;
}

// ────────────────────────────────────────────────────────────────
// GET /export.descriptive_stats.md - APA 形式 記述統計テーブル
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/export.descriptive_stats.md",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    const data = await gatherAnalysisData(db, user, { studentId, fromDate, toDate });

    // 変数ごとに配列を抽出
    const pick = (key: keyof AnalysisDatum) =>
      data.map((d) => (d[key] == null ? null : Number(d[key] as any)));

    const aiTotal = describe(pick("ai_total"));
    const aiF1 = describe(pick("ai_f1"));
    const aiF2 = describe(pick("ai_f2"));
    const aiF3 = describe(pick("ai_f3"));
    const aiF4 = describe(pick("ai_f4"));
    const aiF5 = describe(pick("ai_f5"));
    const aiF6 = describe(pick("ai_f6"));
    const huTotal = describe(pick("hu_total"));
    const huF1 = describe(pick("hu_f1"));
    const huF2 = describe(pick("hu_f2"));
    const huF3 = describe(pick("hu_f3"));
    const huF4 = describe(pick("hu_f4"));
    const huF5 = describe(pick("hu_f5"));
    const huF6 = describe(pick("hu_f6"));
    const segs = describe(pick("scat_segments"));
    const concs = describe(pick("scat_concepts"));
    const themes = describe(pick("scat_themes"));
    const wc = describe(pick("word_count"));
    const refChars = describe(pick("reflection_chars"));
    const blockChars = describe(pick("block_chars_total"));

    const now = new Date().toISOString();
    const lines: string[] = [];
    lines.push(`# 記述統計表 (Descriptive Statistics)`);
    lines.push("");
    lines.push(`- 生成日時: ${now}`);
    lines.push(`- 対象日誌数 (N): ${data.length}`);
    lines.push(`- フィルタ: student_id=${studentId ?? "(全件)"}, from=${fromDate ?? "(指定なし)"}, to=${toDate ?? "(指定なし)"}`);
    lines.push(`- 形式: APA 7th edition 準拠 / 歪度はFisher-Pearson、尖度はexcess kurtosis (正規分布で 0)`);
    lines.push("");

    lines.push(`## 表1. AI 評価スコアの記述統計`);
    lines.push("");
    lines.push(`*Note.* M = mean, SD = standard deviation, Mdn = median.`);
    lines.push("");
    lines.push(`| 変数 | n | M | SD | Mdn | Min | Max | Skewness | Kurtosis | 備考 |`);
    lines.push(`|---|---|---|---|---|---|---|---|---|---|`);
    lines.push(apaDescRow("AI 合計スコア", aiTotal));
    lines.push(apaDescRow("AI 因子1", aiF1));
    lines.push(apaDescRow("AI 因子2", aiF2));
    lines.push(apaDescRow("AI 因子3", aiF3));
    lines.push(apaDescRow("AI 因子4", aiF4));
    lines.push(apaDescRow("AI 因子5", aiF5));
    lines.push(apaDescRow("AI 因子6", aiF6));
    lines.push("");

    lines.push(`## 表2. 人間評価スコア(評価者平均)の記述統計`);
    lines.push("");
    lines.push(`| 変数 | n | M | SD | Mdn | Min | Max | Skewness | Kurtosis | 備考 |`);
    lines.push(`|---|---|---|---|---|---|---|---|---|---|`);
    lines.push(apaDescRow("人間 合計スコア (平均)", huTotal));
    lines.push(apaDescRow("人間 因子1 (平均)", huF1));
    lines.push(apaDescRow("人間 因子2 (平均)", huF2));
    lines.push(apaDescRow("人間 因子3 (平均)", huF3));
    lines.push(apaDescRow("人間 因子4 (平均)", huF4));
    lines.push(apaDescRow("人間 因子5 (平均)", huF5));
    lines.push(apaDescRow("人間 因子6 (平均)", huF6));
    lines.push("");

    lines.push(`## 表3. SCAT 質的コーディング指標の記述統計`);
    lines.push("");
    lines.push(`*Note.* SCAT は大谷 (2008) の Steps for Coding and Theorization。`);
    lines.push("");
    lines.push(`| 変数 | n | M | SD | Mdn | Min | Max | Skewness | Kurtosis | 備考 |`);
    lines.push(`|---|---|---|---|---|---|---|---|---|---|`);
    lines.push(apaDescRow("SCAT セグメント数", segs));
    lines.push(apaDescRow("SCAT 概念数 (step3)", concs));
    lines.push(apaDescRow("SCAT テーマ数 (step4)", themes));
    lines.push("");

    lines.push(`## 表4. 日誌記述量の記述統計`);
    lines.push("");
    lines.push(`| 変数 | n | M | SD | Mdn | Min | Max | Skewness | Kurtosis | 備考 |`);
    lines.push(`|---|---|---|---|---|---|---|---|---|---|`);
    lines.push(apaDescRow("語数 (word_count)", wc));
    lines.push(apaDescRow("時限ブロック総文字数", blockChars));
    lines.push(apaDescRow("省察パート文字数", refChars));
    lines.push("");

    lines.push(`---`);
    lines.push("");
    lines.push(`## 注記`);
    lines.push("");
    lines.push(`- SD は不偏標準偏差 (分母 n-1) を用いた。`);
    lines.push(`- Skewness は Fisher-Pearson の標本歪度 (g₁)、Kurtosis は超過尖度 (g₂; 正規分布で 0) を採用 (SciPy の \`bias=False\` 相当)。`);
    lines.push(`- 欠損値は除外 (listwise deletion)。各変数の n はそれぞれ独立。`);
    lines.push(`- AI 評価は journal_id ごとに最新の eval_type='ai' レコードを採用。`);
    lines.push(`- 人間評価は評価者間で平均した値を 1 日誌の代表値として扱った。`);
    lines.push(`- **備考**列は計算がスキップ/退化した理由を示す (Phase 7-3):`);
    lines.push(`    - \`${formatSkipReason("insufficient_n")}\` : n<2 のため SD/歪度/尖度が算出不能。`);
    lines.push(`    - \`${formatSkipReason("no_variance")}\` : 値が全件同一 (SD=0) のため歪度/尖度が算出不能。`);
    lines.push("");

    const md = lines.join("\n");
    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "descriptive_stats_md",
      visibleRecordCount: data.length,
      scopeBasis: user.role === "admin" ? "admin_all" : "uploader_own",
      reason: `descriptive_stats_md | filters: student=${studentId ?? ""},from=${fromDate ?? ""},to=${toDate ?? ""}`,
    });
    return new Response(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-descriptive-stats-${csvTimestamp()}.md"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ────────────────────────────────────────────────────────────────
// GET /export.correlation.csv - Pearson 相関行列 (AI 各因子 × 人間 各因子)
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/export.correlation.csv",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    const data = await gatherAnalysisData(db, user, { studentId, fromDate, toDate });

    const vars: Array<{ key: keyof AnalysisDatum; label: string }> = [
      { key: "ai_total", label: "AI_total" },
      { key: "ai_f1", label: "AI_F1" },
      { key: "ai_f2", label: "AI_F2" },
      { key: "ai_f3", label: "AI_F3" },
      { key: "ai_f4", label: "AI_F4" },
      { key: "ai_f5", label: "AI_F5" },
      { key: "ai_f6", label: "AI_F6" },
      { key: "hu_total", label: "Human_total" },
      { key: "hu_f1", label: "Human_F1" },
      { key: "hu_f2", label: "Human_F2" },
      { key: "hu_f3", label: "Human_F3" },
      { key: "hu_f4", label: "Human_F4" },
      { key: "hu_f5", label: "Human_F5" },
      { key: "hu_f6", label: "Human_F6" },
      { key: "scat_segments", label: "SCAT_segments" },
      { key: "scat_concepts", label: "SCAT_concepts" },
      { key: "scat_themes", label: "SCAT_themes" },
      { key: "word_count", label: "WordCount" },
    ];

    const series = vars.map((v) =>
      data.map((d) => (d[v.key] == null ? null : Number(d[v.key] as any))),
    );

    const rows: string[] = [];
    // ヘッダ: 変数1, 変数2, n, r, t, df, p, p_sig, ci_lower, ci_upper, skip_reason (Phase 7-3)
    rows.push("variable_1,variable_2,n,r,t,df,p,p_sig,ci_lower_95,ci_upper_95,skip_reason");

    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        const r = pearson(series[i], series[j]);
        rows.push(
          [
            vars[i].label,
            vars[j].label,
            r.n,
            r.r != null ? r.r.toFixed(4) : "",
            r.t != null && Number.isFinite(r.t) ? r.t.toFixed(4) : "",
            r.df != null ? r.df : "",
            r.p != null ? r.p.toFixed(6) : "",
            pStars(r.p),
            r.ci_lower != null ? r.ci_lower.toFixed(4) : "",
            r.ci_upper != null ? r.ci_upper.toFixed(4) : "",
            // Phase 7-3: edge-case 識別子 (機械可読 enum、空文字なら通常推定)
            r.skip_reason ?? "",
          ]
            .map(csvEscape)
            .join(","),
        );
      }
    }

    const bom = "\uFEFF";
    const csv = bom + rows.join("\r\n");

    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "correlation_csv",
      visibleRecordCount: rows.length - 1,
      scopeBasis: user.role === "admin" ? "admin_all" : "uploader_own",
      reason: `correlation_csv | filters: student=${studentId ?? ""},from=${fromDate ?? ""},to=${toDate ?? ""}`,
    });
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-correlation-${csvTimestamp()}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ────────────────────────────────────────────────────────────────
// GET /export.t_test.md - t 検定結果 (週前半 vs 後半 / AI vs 人間 paired)
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/export.t_test.md",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    // 群分けの閾値 (デフォ: week_number <= 2 を前半、>= 3 を後半)
    const splitWeek = parseInt(c.req.query("split_week") || "2", 10) || 2;
    // Phase 7-4: 多重比較補正の指定 (none / bonferroni / holm / fdr_bh)
    //   Welch table と Paired table はそれぞれ独立した test family として補正する。
    const correctionMethod: MultipleComparisonMethod = parseCorrectionMethod(c.req.query("correction"));
    const showAdj = correctionMethod !== "none";

    const data = await gatherAnalysisData(db, user, { studentId, fromDate, toDate });

    // 週で 2 群分け
    const firstHalf = data.filter((d) => d.week_number != null && d.week_number <= splitWeek);
    const secondHalf = data.filter((d) => d.week_number != null && d.week_number > splitWeek);

    const welchVars: Array<{ key: keyof AnalysisDatum; label: string }> = [
      { key: "ai_total", label: "AI 合計スコア" },
      { key: "ai_f1", label: "AI 因子1" },
      { key: "ai_f2", label: "AI 因子2" },
      { key: "ai_f3", label: "AI 因子3" },
      { key: "ai_f4", label: "AI 因子4" },
      { key: "ai_f5", label: "AI 因子5" },
      { key: "ai_f6", label: "AI 因子6" },
      { key: "hu_total", label: "人間 合計スコア (平均)" },
      { key: "scat_concepts", label: "SCAT 概念数" },
      { key: "scat_themes", label: "SCAT テーマ数" },
      { key: "word_count", label: "語数" },
      { key: "reflection_chars", label: "省察文字数" },
    ];

    const lines: string[] = [];
    lines.push(`# t 検定結果 (Independent / Paired t-tests)`);
    lines.push("");
    lines.push(`- 生成日時: ${new Date().toISOString()}`);
    lines.push(`- 全対象 N: ${data.length}`);
    lines.push(`- フィルタ: student_id=${studentId ?? "(全件)"}, from=${fromDate ?? "(指定なし)"}, to=${toDate ?? "(指定なし)"}`);
    lines.push(`- 群分け閾値: 前半 = week_number ≤ ${splitWeek}, 後半 = week_number > ${splitWeek}`);
    lines.push(`- 検定: 群間比較は Welch の独立 t 検定 (等分散仮定なし)、AI vs 人間 は対応のある t 検定。`);
    lines.push(`- 効果量: Welch は Cohen's d (プール SD)、Paired は Cohen's dz (差分の SD で標準化)。`);
    lines.push(`- 多重比較補正: ${formatCorrectionMethod(correctionMethod)}` +
      (showAdj ? ` (\`?correction=${correctionMethod}\`)` : ` (\`?correction=bonferroni|holm|fdr_bh\` で適用可能)`));
    lines.push("");

    lines.push(`## 表1. 実習前半 vs 後半 (Welch's independent t-test)`);
    lines.push("");
    // Phase 7-3: skip 理由を末尾列に表示
    // Phase 7-4: correction!=none のときのみ p_adj 列を表示 (Welch family = 同表内の検定群)
    const welchHeader = showAdj
      ? `| 変数 | n₁ | M₁ (SD₁) | n₂ | M₂ (SD₂) | M差 | t | df | p | p_adj | Cohen's d | 備考 |`
      : `| 変数 | n₁ | M₁ (SD₁) | n₂ | M₂ (SD₂) | M差 | t | df | p | Cohen's d | 備考 |`;
    const welchSep = showAdj
      ? `|---|---|---|---|---|---|---|---|---|---|---|---|`
      : `|---|---|---|---|---|---|---|---|---|---|---|`;
    lines.push(welchHeader);
    lines.push(welchSep);

    // Phase 7-4: two-pass — first collect all welch results, then apply correction, then emit rows.
    const welchResults: TTestResult[] = welchVars.map((v) => {
      const g1 = firstHalf.map((d) => (d[v.key] == null ? null : Number(d[v.key] as any)));
      const g2 = secondHalf.map((d) => (d[v.key] == null ? null : Number(d[v.key] as any)));
      return welchTTest(g1, g2);
    });
    const welchPAdj = correctPValues(welchResults.map((r) => r.p), correctionMethod);
    for (let i = 0; i < welchVars.length; i++) {
      const v = welchVars[i];
      const t = welchResults[i];
      const pAdj = welchPAdj[i];
      const note = t.skipped ? formatSkipReason(t.skip_reason) : "";
      const adjCell = showAdj
        ? ` ${fmtPCell(pAdj, t)}${pStars(pAdj)} |`
        : "";
      lines.push(
        `| ${v.label} | ${t.n1} | ${fmt(t.mean1)} (${fmt(t.sd1)}) | ${t.n2} | ${fmt(t.mean2)} (${fmt(t.sd2)}) | ${fmt(t.mean_diff)} | ${fmtCell(t.t, t)} | ${fmtCell(t.df, t, { digits: 1 })} | ${fmtPCell(t.p, t)}${pStars(t.p)} |${adjCell} ${fmtCell(t.cohen_d, t)} | ${note} |`,
      );
    }
    lines.push("");

    lines.push(`## 表2. AI vs 人間 評価の差 (対応のある t 検定)`);
    lines.push("");
    lines.push(`*Note.* AI と人間 (評価者平均) が両方存在する日誌のみが対象。`);
    lines.push("");
    // Phase 7-3: skip 理由を末尾列に表示
    // Phase 7-4: correction!=none のときのみ p_adj 列を表示 (Paired family = 7 pair の検定群)
    const pairedHeader = showAdj
      ? `| 比較ペア | n | M_AI (SD) | M_人間 (SD) | M差 (AI−人間) | t | df | p | p_adj | Cohen's dz | 備考 |`
      : `| 比較ペア | n | M_AI (SD) | M_人間 (SD) | M差 (AI−人間) | t | df | p | Cohen's dz | 備考 |`;
    const pairedSep = showAdj
      ? `|---|---|---|---|---|---|---|---|---|---|---|`
      : `|---|---|---|---|---|---|---|---|---|---|`;
    lines.push(pairedHeader);
    lines.push(pairedSep);
    const pairedPairs: Array<{ ai: keyof AnalysisDatum; hu: keyof AnalysisDatum; label: string }> = [
      { ai: "ai_total", hu: "hu_total", label: "合計スコア" },
      { ai: "ai_f1", hu: "hu_f1", label: "因子1" },
      { ai: "ai_f2", hu: "hu_f2", label: "因子2" },
      { ai: "ai_f3", hu: "hu_f3", label: "因子3" },
      { ai: "ai_f4", hu: "hu_f4", label: "因子4" },
      { ai: "ai_f5", hu: "hu_f5", label: "因子5" },
      { ai: "ai_f6", hu: "hu_f6", label: "因子6" },
    ];
    // Phase 7-4: two-pass — first collect, correct, then emit.
    const pairedResults: TTestResult[] = pairedPairs.map((pp) => {
      const xs = data.map((d) => (d[pp.ai] == null ? null : Number(d[pp.ai] as any)));
      const ys = data.map((d) => (d[pp.hu] == null ? null : Number(d[pp.hu] as any)));
      return pairedTTest(xs, ys);
    });
    const pairedPAdj = correctPValues(pairedResults.map((r) => r.p), correctionMethod);
    for (let i = 0; i < pairedPairs.length; i++) {
      const pp = pairedPairs[i];
      const t = pairedResults[i];
      const pAdj = pairedPAdj[i];
      const note = t.skipped ? formatSkipReason(t.skip_reason) : "";
      const adjCell = showAdj
        ? ` ${fmtPCell(pAdj, t)}${pStars(pAdj)} |`
        : "";
      lines.push(
        `| ${pp.label} | ${t.n1} | ${fmt(t.mean1)} (${fmt(t.sd1)}) | ${fmt(t.mean2)} (${fmt(t.sd2)}) | ${fmt(t.mean_diff)} | ${fmtCell(t.t, t)} | ${t.df != null ? t.df : (t.skipped ? `— (${formatSkipReason(t.skip_reason)})` : "—")} | ${fmtPCell(t.p, t)}${pStars(t.p)} |${adjCell} ${fmtCell(t.cohen_d, t)} | ${note} |`,
      );
    }
    lines.push("");

    lines.push(`---`);
    lines.push("");
    lines.push(`## 注記`);
    lines.push("");
    lines.push(`- 有意水準は * p < .05, ** p < .01, *** p < .001 を採用。`);
    lines.push(`- Welch 自由度は Welch-Satterthwaite 近似で算出。`);
    lines.push(`- p 値は Student t 分布の両側確率を不完全ベータ関数 (Numerical Recipes 6.4) で計算。`);
    lines.push(`- 結果はリッスンワイズ削除 (両群とも値がある日誌のみ paired 検定の対象)。`);
    lines.push(`- **備考**列は計算がスキップ/退化した理由を示す (Phase 7-3):`);
    lines.push(`    - \`${formatSkipReason("insufficient_n")}\` : Welch は n₁<2 または n₂<2、Paired は n<2。`);
    lines.push(`    - \`${formatSkipReason("no_variance")}\` : Welch は両群とも分散ゼロ、Paired は AI と人間が全 pair で完全一致 (差分の SD=0)。`);
    lines.push(`    - 備考列が空の場合は通常推定が可能であったことを示す。`);
    if (showAdj) {
      lines.push(`- **p_adj** 列 (Phase 7-4) は ${formatCorrectionMethod(correctionMethod)} による多重比較補正後の p 値:`);
      if (correctionMethod === "bonferroni") {
        lines.push(`    - Bonferroni: \`p_adj = min(p × m, 1)\` (family-wise error rate 制御、最も保守的)。`);
      } else if (correctionMethod === "holm") {
        lines.push(`    - Holm step-down: 昇順にソートし \`p_adj[i] = max(prev, min(p[i] × (m - i), 1))\` (family-wise error rate 制御、Bonferroni より検出力が高い)。`);
      } else if (correctionMethod === "fdr_bh") {
        lines.push(`    - Benjamini-Hochberg: 昇順にソートし \`p_adj[i] = min_{k ≥ i}(p[k] × m / (k+1))\` で 1 に clamp (false discovery rate 制御、最も検出力が高い)。`);
      }
      lines.push(`    - test family は表ごとに独立 (表1 = ${welchVars.length} 検定, 表2 = ${pairedPairs.length} 検定)。`);
      lines.push(`    - 備考列に理由が表示された行 (p=null) は test family の m から除外される。`);
    } else {
      lines.push(`- 多重比較補正は適用していません。\`?correction=bonferroni\` / \`holm\` / \`fdr_bh\` で適用可能 (Phase 7-4)。`);
    }
    lines.push("");

    const md = lines.join("\n");
    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "t_test_md",
      visibleRecordCount: data.length,
      scopeBasis: user.role === "admin" ? "admin_all" : "uploader_own",
      reason: `t_test_md | split_week=${splitWeek} | correction=${correctionMethod} | filters: student=${studentId ?? ""},from=${fromDate ?? ""},to=${toDate ?? ""}`,
    });
    return new Response(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-t-test-${csvTimestamp()}.md"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ────────────────────────────────────────────────────────────────
// GET /export.methods_section.md - 論文 Methods セクション 自動生成
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/export.methods_section.md",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    const data = await gatherAnalysisData(db, user, { studentId, fromDate, toDate });

    // 軽い記述統計を取得 (Participants サマリ用)
    const studentIds = new Set(data.map((d) => d.student_id).filter(Boolean));
    const nJournals = data.length;
    const nStudents = studentIds.size;
    const aiCount = data.filter((d) => d.ai_total != null).length;
    const humanCount = data.filter((d) => d.hu_total != null).length;
    const scatCount = data.filter((d) => d.scat_segments > 0).length;
    const weeks = data.map((d) => d.week_number).filter((w): w is number => w != null);
    const minWeek = weeks.length > 0 ? Math.min(...weeks) : null;
    const maxWeek = weeks.length > 0 ? Math.max(...weeks) : null;
    const wc = describe(data.map((d) => d.word_count));

    const now = new Date().toISOString();
    const lines: string[] = [];
    lines.push(`# Methods (論文用 自動生成下書き)`);
    lines.push("");
    lines.push(`> このセクションは本プラットフォームのエクスポート時点 (${now}) のデータと使用ツール情報から自動生成された下書きです。論文への記載前に内容を確認・校正してください。`);
    lines.push("");

    lines.push(`## Participants and Data`);
    lines.push("");
    lines.push(`本研究では、教育実習における学生の実習日誌を質的・量的に分析した。分析対象は、教育実習日誌評価プラットフォーム (本システム) に取り込まれた全 ${nJournals} 件の日誌である (${nStudents} 名の学生による記述; 実習週 ${minWeek ?? "n/a"} 週目から ${maxWeek ?? "n/a"} 週目まで)。`);
    lines.push("");
    lines.push(`各日誌の語数の平均は M = ${fmt(wc.mean)} (SD = ${fmt(wc.sd)}, Mdn = ${fmt(wc.median)}, 範囲 = ${fmt(wc.min, 0)}–${fmt(wc.max, 0)}) であった。`);
    lines.push("");
    lines.push(`日誌のうち AI 評価が付与されたものは ${aiCount} 件、人間評価者による評定が付与されたものは ${humanCount} 件、SCAT による質的コーディングが実施されたものは ${scatCount} 件であった。`);
    lines.push("");
    lines.push(`分析対象範囲: student_id=${studentId ?? "(全学生)"}, 期間=${fromDate ?? "(指定なし)"} 〜 ${toDate ?? "(指定なし)"}。`);
    lines.push("");

    lines.push(`## Materials and Instruments`);
    lines.push("");
    lines.push(`### 評価尺度`);
    lines.push("");
    lines.push(`日誌は 6 因子40項目構造の評価ルーブリック (因子1〜因子6) に基づき、合計スコアおよび各因子スコアを 0–5 のリッカート尺度で評定した。`);
    lines.push("");
    lines.push(`### 質的分析手法`);
    lines.push("");
    lines.push(`質的データの分析には SCAT (Steps for Coding and Theorization; 大谷, 2008) を採用した。SCAT は (1) 着目語句の抽出、(2) 言い換え、(3) 説明 (概念化)、(4) テーマ・構成概念の生成、の 4 段階で進める手法であり、本研究では各日誌からセグメントを切り出し、step3 で概念、step4 でテーマを生成した。`);
    lines.push("");

    lines.push(`## AI Evaluation`);
    lines.push("");
    lines.push(`AI 評価は大規模言語モデル (LLM) を用いて行った。各日誌に対し、評価ルーブリックを与えたプロンプトを通じて自動評定を取得した。プロンプトのバージョン管理 (\`prompt_version\`) およびハロー効果検出 (\`halo_detected\`) のメタデータも併せて記録した。AI 評価と人間評価の一致度は、Pearson 相関係数と対応のある t 検定で検討した。`);
    lines.push("");

    lines.push(`## Statistical Analysis`);
    lines.push("");
    lines.push(`記述統計として、平均 (M)、不偏標準偏差 (SD, 分母 n−1)、中央値 (Mdn)、最小値・最大値、Fisher-Pearson の標本歪度 (g₁)、超過尖度 (g₂; 正規分布で 0) を算出した。`);
    lines.push("");
    lines.push(`群間比較には Welch の独立 t 検定 (等分散を仮定しない; Welch-Satterthwaite 近似による自由度) を、AI 評価と人間評価の一致比較には対応のある t 検定を用いた。効果量は Cohen's d (プール SD で標準化) および Cohen's dz (差分の SD で標準化) を併記した。相関分析には Pearson の積率相関係数を用い、Fisher の z 変換による 95% 信頼区間を算出した。`);
    lines.push("");
    lines.push(`有意水準は p < .05 を採用し、p 値は両側確率で報告した。多重比較補正は本研究では行わなかったが、相関行列および t 検定の結果は探索的解釈に留め、確証的検証は今後の研究課題とする。報告形式は APA 7th edition に準拠した。`);
    lines.push("");

    lines.push(`## Software and Tools`);
    lines.push("");
    lines.push(`データの取り込み、構造化、評価、分析、エクスポートには、本研究のために独自に構築した「教育実習日誌評価プラットフォーム」を用いた。プラットフォームは以下の技術スタックで実装されている:`);
    lines.push("");
    lines.push(`- **バックエンド**: Hono (TypeScript) on Cloudflare Workers / Cloudflare Pages`);
    lines.push(`- **データベース**: Cloudflare D1 (SQLite 互換)`);
    lines.push(`- **フロントエンド**: React + Material-UI`);
    lines.push(`- **OCR / テキスト抽出**: Markdown 変換ツールチェーン および Google Cloud Vision API (OCR)`);
    lines.push(`- **AI 評価**: OpenAI GPT 系大規模言語モデル`);
    lines.push(`- **統計計算**: 本プラットフォーム内で TypeScript により実装 (Student t 分布 CDF は不完全ベータ関数 [Numerical Recipes 6.4] により計算; Lanczos 近似による log Γ; Pearson 相関の有意性検定は t 統計量 t = r√((n−2)/(1−r²)) と t 分布で算出)`);
    lines.push("");
    lines.push(`データの再現可能性のため、エクスポート時のデータ辞書 (codebook) およびエクスポートログ (監査ログ) を保存している。各エクスポートには \`exported_at\` (ISO 8601 UTC) と \`filters\` (適用フィルタ) が記録されており、論文 Methods 末尾または Supplementary Materials に引用することで再現可能性を担保できる。`);
    lines.push("");

    lines.push(`## Ethical Considerations`);
    lines.push("");
    lines.push(`本研究のデータは、参加者から研究使用の同意を得た上で収集された。データは個人を特定できない形で集計・分析され、論文公表時には学生 ID および個人名を匿名化した。本プラットフォームは役割ベースのアクセス制御 (role-based access control) と全データ読み出しの監査ログ (audit log) を実装しており、データへのアクセスは追跡可能である。`);
    lines.push("");

    lines.push(`---`);
    lines.push("");
    lines.push(`## 推奨される引用形式 (References セクション用)`);
    lines.push("");
    lines.push(`- 大谷尚 (2008). 4 ステップコーディングによる質的データ分析手法 SCAT の提案 ― 着手しやすく小規模データにも適用可能な理論化の手続き ―. *名古屋大学大学院教育発達科学研究科紀要 (教育科学)*, 54(2), 27–44.`);
    lines.push(`- American Psychological Association. (2020). *Publication manual of the American Psychological Association* (7th ed.). American Psychological Association.`);
    lines.push(`- Press, W. H., Teukolsky, S. A., Vetterling, W. T., & Flannery, B. P. (2007). *Numerical recipes: The art of scientific computing* (3rd ed.). Cambridge University Press.`);
    lines.push("");

    const md = lines.join("\n");
    setAuditReadContext(c, {
      resourceType: "journal_import_export",
      resourceId: "methods_section_md",
      visibleRecordCount: data.length,
      scopeBasis: user.role === "admin" ? "admin_all" : "uploader_own",
      reason: `methods_section_md | filters: student=${studentId ?? ""},from=${fromDate ?? ""},to=${toDate ?? ""}`,
    });
    return new Response(md, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="journal-methods-section-${csvTimestamp()}.md"`,
        "Cache-Control": "no-store",
      },
    });
  },
);

// ────────────────────────────────────────────────────────────────
// GET / - 取り込み一覧 (uploaded_by 単位)
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const status = c.req.query("status");
    const studentId = c.req.query("student_id");
    const fromDate = c.req.query("from");
    const toDate = c.req.query("to");
    const q = c.req.query("q"); // ファイル名検索
    const limit = Math.min(
      parseInt(c.req.query("limit") || "200", 10) || 200,
      1000,
    );
    const offset = Math.max(parseInt(c.req.query("offset") || "0", 10) || 0, 0);

    // 件数カウント (UI のページング用)
    let countSql = `SELECT COUNT(*) AS cnt FROM journal_imports ji WHERE 1=1`;
    let sql = `SELECT ji.*, u.name AS student_name
               FROM journal_imports ji
               LEFT JOIN users u ON u.id = ji.student_id
               WHERE 1=1`;
    const params: any[] = [];

    // researcher は自分の取り込みのみ。admin は全件。
    if (user.role !== "admin") {
      countSql += ` AND ji.uploaded_by = ?`;
      sql += ` AND ji.uploaded_by = ?`;
      params.push(user.id);
    }
    if (status) {
      countSql += ` AND ji.status = ?`;
      sql += ` AND ji.status = ?`;
      params.push(status);
    }
    if (studentId) {
      countSql += ` AND ji.student_id = ?`;
      sql += ` AND ji.student_id = ?`;
      params.push(studentId);
    }
    if (fromDate) {
      countSql += ` AND ji.entry_date >= ?`;
      sql += ` AND ji.entry_date >= ?`;
      params.push(fromDate);
    }
    if (toDate) {
      countSql += ` AND ji.entry_date <= ?`;
      sql += ` AND ji.entry_date <= ?`;
      params.push(toDate);
    }
    if (q) {
      countSql += ` AND ji.filename LIKE ?`;
      sql += ` AND ji.filename LIKE ?`;
      params.push(`%${q}%`);
    }
    // ソート: 学生ごとにまとめて → 週・日付の昇順 (グルーピング用)
    sql += ` ORDER BY
              CASE WHEN ji.student_id IS NULL THEN 1 ELSE 0 END,
              ji.student_id ASC,
              CASE WHEN ji.week_number IS NULL THEN 1 ELSE 0 END,
              ji.week_number ASC,
              CASE WHEN ji.entry_date IS NULL THEN 1 ELSE 0 END,
              ji.entry_date ASC,
              ji.created_at DESC
            LIMIT ? OFFSET ?`;

    const countRow = await db
      .prepare(countSql)
      .bind(...params)
      .first<{ cnt: number }>();
    const total = Number(countRow?.cnt || 0);

    const dataParams = [...params, limit, offset];
    const res = await db
      .prepare(sql)
      .bind(...dataParams)
      .all();
    return c.json({
      success: true,
      items: res.results || [],
      total,
      limit,
      offset,
    });
  },
);

// ────────────────────────────────────────────────────────────────
// GET /:id - 詳細
// ────────────────────────────────────────────────────────────────
journalImportsRouter.get(
  "/:id",
  requireAuth,
  requireRoles(READ_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, error: "missing_id" }, 400);
    const rec = await getImportRecord(db, id);
    if (!rec) return c.json({ success: false, error: "not_found" }, 404);
    if (user.role !== "admin" && rec.uploaded_by !== user.id) {
      return c.json({ success: false, error: "forbidden" }, 403);
    }
    return c.json({ success: true, item: rec });
  },
);

// ────────────────────────────────────────────────────────────────
// POST /upload - ファイルアップロード + 即座に toMarkdown で抽出
//   multipart/form-data: file (必須)
// ────────────────────────────────────────────────────────────────
journalImportsRouter.post(
  "/upload",
  requireAuth,
  requireRoles(WRITE_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");

    let form: FormData;
    try {
      form = await c.req.formData();
    } catch (e: any) {
      return c.json(
        { success: false, error: "invalid_form", message: String(e) },
        400,
      );
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      return c.json(
        { success: false, error: "missing_file", message: "file フィールドが必要です" },
        400,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return c.json(
        {
          success: false,
          error: "file_too_large",
          message: `ファイルサイズが上限 ${MAX_FILE_SIZE / 1024 / 1024} MB を超えています`,
        },
        413,
      );
    }
    const filename = file.name || "unnamed";
    const mime = normalizeMime(file.type || "", filename);

    if (!isSupportedMime(mime, filename)) {
      return c.json(
        {
          success: false,
          error: "unsupported_format",
          message: `対応していないファイル形式です: ${mime} (${filename})`,
          mime,
          filename,
        },
        415,
      );
    }

    const importId = "imp_" + crypto.randomUUID();
    try {
      await createImportRecord(db, {
        id: importId,
        uploaded_by: user.id,
        filename,
        mime_type: mime,
        file_size: file.size,
      });
    } catch (e: any) {
      return c.json(
        { success: false, error: "db_error", message: String(e) },
        500,
      );
    }

    // toMarkdown / Vision で抽出
    await updateImportRecord(db, importId, { status: "extracting" });
    try {
      const buf = await file.arrayBuffer();
      const result = await extractDocument(
        c.env.AI,
        c.env.GOOGLE_CLOUD_VISION_API_KEY,
        filename,
        mime,
        buf,
      );
      await updateImportRecord(db, importId, {
        status: "extracted",
        extract_source: result.source,
        raw_text: result.rawText,
        token_count: result.tokens ?? null,
      });
      const final = await getImportRecord(db, importId);
      return c.json({ success: true, item: final });
    } catch (e: any) {
      await updateImportRecord(db, importId, {
        status: "failed",
        error_message: String(e?.message || e),
      });
      return c.json(
        {
          success: false,
          error: "extract_failed",
          message: String(e?.message || e),
          import_id: importId,
        },
        500,
      );
    }
  },
);

// ────────────────────────────────────────────────────────────────
// POST /:id/structure - GPT-4 で日誌スキーマに構造化
// ────────────────────────────────────────────────────────────────
journalImportsRouter.post(
  "/:id/structure",
  requireAuth,
  requireRoles(WRITE_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, error: "missing_id" }, 400);

    const rec = await getImportRecord(db, id);
    if (!rec) return c.json({ success: false, error: "not_found" }, 404);
    if (user.role !== "admin" && rec.uploaded_by !== user.id) {
      return c.json({ success: false, error: "forbidden" }, 403);
    }
    if (!rec.raw_text) {
      return c.json(
        {
          success: false,
          error: "no_raw_text",
          message: "抽出済みのテキストがありません。再アップロードしてください",
        },
        400,
      );
    }

    await updateImportRecord(db, id, { status: "structuring", error_message: null });
    try {
      const structured = await structureWithGpt(
        c.env.OPENAI_API_KEY,
        rec.raw_text,
        rec.filename,
      );
      await updateImportRecord(db, id, {
        status: "structured",
        structured_json: JSON.stringify(structured),
        entry_date: structured.entry_date,
        week_number: structured.week_number,
        word_count: estimateWordCount(structured),
      });
      const final = await getImportRecord(db, id);
      return c.json({ success: true, item: final, structured });
    } catch (e: any) {
      await updateImportRecord(db, id, {
        status: "failed",
        error_message: String(e?.message || e),
      });
      return c.json(
        {
          success: false,
          error: "structure_failed",
          message: String(e?.message || e),
        },
        500,
      );
    }
  },
);

// ────────────────────────────────────────────────────────────────
// PATCH /:id - student_id / structured_json / entry_date / week_number 修正
// ────────────────────────────────────────────────────────────────
journalImportsRouter.patch(
  "/:id",
  requireAuth,
  requireRoles(WRITE_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, error: "missing_id" }, 400);

    const rec = await getImportRecord(db, id);
    if (!rec) return c.json({ success: false, error: "not_found" }, 404);
    if (user.role !== "admin" && rec.uploaded_by !== user.id) {
      return c.json({ success: false, error: "forbidden" }, 403);
    }
    if (rec.status === "committed") {
      return c.json(
        { success: false, error: "already_committed", message: "コミット済みは編集できません" },
        409,
      );
    }

    const body = await c.req.json().catch(() => ({}));
    const patch: any = {};
    if (body.student_id !== undefined) patch.student_id = body.student_id || null;
    if (body.entry_date !== undefined) patch.entry_date = body.entry_date || null;
    if (body.week_number !== undefined) {
      // Phase 7-2: journal_imports.week_number は NULL 可。
      // NULL / 空文字は許可、それ以外は 1..52 の整数のみ。
      if (body.week_number === null || body.week_number === "") {
        patch.week_number = null;
      } else {
        const v = validateWeekNumber(body.week_number);
        if (!v.ok) {
          return c.json({ success: false, error: "validation_error", message: v.error }, 400);
        }
        patch.week_number = v.value;
      }
    }
    if (body.structured !== undefined) {
      // structured は JSON オブジェクトで来る
      const s: StructuredJournal = body.structured;
      patch.structured_json = JSON.stringify(s);
      patch.word_count = estimateWordCount(s);
      if (s.entry_date !== undefined) patch.entry_date = s.entry_date;
      if (s.week_number !== undefined) {
        // structured.week_number も同様に検証 (NULL は許容)
        if (s.week_number === null) {
          patch.week_number = null;
        } else {
          const v = validateWeekNumber(s.week_number);
          if (!v.ok) {
            return c.json({ success: false, error: "validation_error", message: v.error }, 400);
          }
          patch.week_number = v.value;
        }
      }
    }
    if (Object.keys(patch).length === 0) {
      return c.json({ success: false, error: "no_changes" }, 400);
    }
    await updateImportRecord(db, id, patch);
    const final = await getImportRecord(db, id);
    return c.json({ success: true, item: final });
  },
);

// ────────────────────────────────────────────────────────────────
// POST /:id/commit - journal_entries にINSERT (重複時は UPDATE)
//   - student_id 必須
//   - entry_date 必須
//   - structured_json 必須
// ────────────────────────────────────────────────────────────────
journalImportsRouter.post(
  "/:id/commit",
  requireAuth,
  requireRoles(WRITE_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, error: "missing_id" }, 400);

    const rec = await getImportRecord(db, id);
    if (!rec) return c.json({ success: false, error: "not_found" }, 404);
    if (user.role !== "admin" && rec.uploaded_by !== user.id) {
      return c.json({ success: false, error: "forbidden" }, 403);
    }
    if (rec.status === "committed") {
      return c.json(
        {
          success: false,
          error: "already_committed",
          message: "既にコミット済みです",
          journal_id: rec.journal_id,
        },
        409,
      );
    }
    if (!rec.student_id) {
      return c.json(
        { success: false, error: "missing_student_id", message: "学生を指定してください" },
        400,
      );
    }
    if (!rec.entry_date) {
      return c.json(
        {
          success: false,
          error: "missing_entry_date",
          message: "日付 (entry_date) を指定してください",
        },
        400,
      );
    }
    if (!rec.structured_json) {
      return c.json(
        {
          success: false,
          error: "missing_structured",
          message: "構造化を先に実行してください",
        },
        400,
      );
    }

    let structured: StructuredJournal;
    try {
      structured = JSON.parse(rec.structured_json);
    } catch (e) {
      return c.json(
        { success: false, error: "invalid_structured_json", message: String(e) },
        500,
      );
    }

    const content = structuredToJournalContent(structured);
    const wordCount = rec.word_count || estimateWordCount(structured);

    // Phase 7-2: rec.week_number が異常な場合でもコミット段階で 1..52 を強制
    // NULL の場合は従来通り 1 にフォールバック
    const rawWeek = rec.week_number ?? 1;
    const weekValidation = validateWeekNumber(rawWeek);
    if (!weekValidation.ok) {
      return c.json(
        {
          success: false,
          error: "invalid_week_number",
          message: `journal_imports.week_number is out of range: ${weekValidation.error}. ` +
                   `PATCH /:id で正しい週番号 (1..52) を指定してから再度コミットしてください。`,
        },
        400,
      );
    }
    const weekNumber = weekValidation.value;
    const title = structured.title || `(取り込み) ${rec.filename}`;
    const ocrConfidence = structured.confidence
      ? Math.round(structured.confidence * 100)
      : null;

    await updateImportRecord(db, id, { status: "committing" });

    try {
      // 重複チェック: (student_id, entry_date) UNIQUE
      const dup: any = await db
        .prepare(
          `SELECT id FROM journal_entries WHERE student_id = ? AND entry_date = ?`,
        )
        .bind(rec.student_id, rec.entry_date)
        .first();

      let journalId: string;
      if (dup) {
        journalId = dup.id;
        await db
          .prepare(
            `UPDATE journal_entries
             SET title = ?, content = ?, word_count = ?, week_number = ?,
                 status = 'submitted', ocr_source = ?, ocr_confidence = ?,
                 updated_at = datetime('now')
             WHERE id = ?`,
          )
          .bind(
            title,
            content,
            wordCount,
            weekNumber,
            rec.extract_source || "import",
            ocrConfidence,
            journalId,
          )
          .run();
      } else {
        journalId = "jrn_" + crypto.randomUUID();
        await db
          .prepare(
            `INSERT INTO journal_entries
             (id, student_id, entry_date, week_number, title, content,
              word_count, status, ocr_source, ocr_confidence)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)`,
          )
          .bind(
            journalId,
            rec.student_id,
            rec.entry_date,
            weekNumber,
            title,
            content,
            wordCount,
            rec.extract_source || "import",
            ocrConfidence,
          )
          .run();
      }

      await updateImportRecord(db, id, {
        status: "committed",
        journal_id: journalId,
      });

      const final = await getImportRecord(db, id);
      return c.json({
        success: true,
        item: final,
        journal_id: journalId,
        was_update: !!dup,
      });
    } catch (e: any) {
      await updateImportRecord(db, id, {
        status: "failed",
        error_message: String(e?.message || e),
      });
      return c.json(
        {
          success: false,
          error: "commit_failed",
          message: String(e?.message || e),
        },
        500,
      );
    }
  },
);

// ────────────────────────────────────────────────────────────────
// DELETE /:id - 取り込み記録を削除 (journal_entries は残す)
// ────────────────────────────────────────────────────────────────
journalImportsRouter.delete(
  "/:id",
  requireAuth,
  requireRoles(WRITE_ROLES),
  async (c) => {
    const db = c.env.DB as D1Database;
    const user = c.get("user");
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, error: "missing_id" }, 400);

    const rec = await getImportRecord(db, id);
    if (!rec) return c.json({ success: false, error: "not_found" }, 404);
    if (user.role !== "admin" && rec.uploaded_by !== user.id) {
      return c.json({ success: false, error: "forbidden" }, 403);
    }
    await db
      .prepare(`DELETE FROM journal_imports WHERE id = ?`)
      .bind(id)
      .run();
    return c.json({ success: true });
  },
);

export default journalImportsRouter;
