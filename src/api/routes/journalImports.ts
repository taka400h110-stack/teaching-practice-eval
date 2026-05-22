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
import { UserRole } from "../../types";
import type { D1Database } from "@cloudflare/workers-types";
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
                  AVG(factor4_score) AS avg_f4
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
      // AI と 人間 の差分
      "score_diff_total",
      "score_diff_f1",
      "score_diff_f2",
      "score_diff_f3",
      "score_diff_f4",
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
      const huTotal = hu?.avg_total;
      const huF1 = hu?.avg_f1;
      const huF2 = hu?.avg_f2;
      const huF3 = hu?.avg_f3;
      const huF4 = hu?.avg_f4;

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
          diff(aiTotal, huTotal),
          diff(aiF1, huF1),
          diff(aiF2, huF2),
          diff(aiF3, huF3),
          diff(aiF4, huF4),
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
      patch.week_number =
        body.week_number === null || body.week_number === ""
          ? null
          : Number(body.week_number);
    }
    if (body.structured !== undefined) {
      // structured は JSON オブジェクトで来る
      const s: StructuredJournal = body.structured;
      patch.structured_json = JSON.stringify(s);
      patch.word_count = estimateWordCount(s);
      if (s.entry_date !== undefined) patch.entry_date = s.entry_date;
      if (s.week_number !== undefined) patch.week_number = s.week_number;
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
    const weekNumber = rec.week_number ?? 1;
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
