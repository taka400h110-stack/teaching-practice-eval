/**
 * アンケートCSV取込ルート（全て /api/survey 配下）
 *
 * エンドポイント:
 *   GET  /items            項目マスタ一覧（尺度・下位因子・逆転・出典・準拠レベル含む）
 *   POST /preview          CSVをアップロードして解析・検証結果を返す（DB書込みなし）
 *   POST /commit           検証済みCSVを取り込む（部分成功対応 / 重複ポリシー適用）
 *   GET  /batches          取込履歴一覧
 *   GET  /batches/:id      取込バッチ詳細（生データ・失敗行含む）
 *   GET  /analysis         研究ID単位で事前事後を突合し、尺度・下位因子別に集計
 *
 * 設計:
 *   - 氏名/学籍番号は扱わない。research_id のみで pre/post を対応付け。
 *   - 元CSVは survey_raw_rows に保全。正規化データは survey_responses に縦持ち。
 *   - 重複は (research_id, phase, item_id) UNIQUE。既定 reject、明示時のみ overwrite。
 */
import { Hono } from "hono";
import { requireAuth, requireRoles } from "../middleware/auth";
import type { D1Database } from "@cloudflare/workers-types";
import type { UserRole } from "../../types";
import { decodeBytes, parseCsvToRecords, type CsvEncoding } from "../utils/csv";
import {
  buildHeaderMapping,
  processRows,
  type Phase,
  type DuplicatePolicy,
} from "../services/surveyImportService";
import {
  SURVEY_ITEMS,
  SURVEY_SCALES,
  SURVEY_SCALE_LABELS,
  SURVEY_ITEM_INDEX,
} from "../../constants/surveyItems";

type Env = {
  Bindings: CloudflareBindings;
  Variables: { user: any };
};

const surveyRouter = new Hono<Env>();

const WRITE_ROLES: UserRole[] = ["researcher", "admin", "collaborator"];
const READ_ROLES: UserRole[] = ["researcher", "admin", "collaborator", "board_observer"];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

// ────────────────────────────────────────────────────────────────
// GET /items - 項目マスタ
// ────────────────────────────────────────────────────────────────
surveyRouter.get("/items", requireAuth, requireRoles(READ_ROLES), (c) => {
  return c.json({
    success: true,
    scales: SURVEY_SCALES.map((s) => ({ key: s, label: SURVEY_SCALE_LABELS[s] })),
    items: SURVEY_ITEMS,
    total: SURVEY_ITEMS.length,
  });
});

// 共通: multipart から CSV バイト列・オプションを取り出す
async function readCsvForm(c: any): Promise<
  | {
      ok: true;
      bytes: Uint8Array;
      filename: string;
      encoding?: CsvEncoding;
      defaultPhase?: Phase;
      duplicatePolicy: DuplicatePolicy;
    }
  | { ok: false; status: number; body: any }
> {
  let form: FormData;
  try {
    form = await c.req.formData();
  } catch (e: any) {
    return { ok: false, status: 400, body: { success: false, error: "invalid_form", message: String(e) } };
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return { ok: false, status: 400, body: { success: false, error: "missing_file", message: "file フィールドが必要です" } };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      status: 413,
      body: { success: false, error: "file_too_large", message: `ファイルサイズが上限 ${MAX_FILE_SIZE / 1024 / 1024} MB を超えています` },
    };
  }
  const encRaw = String(form.get("encoding") || "").trim().toLowerCase();
  const encoding: CsvEncoding | undefined =
    encRaw === "utf-8" || encRaw === "utf8" ? "utf-8" : encRaw === "shift_jis" || encRaw === "sjis" ? "shift_jis" : undefined;
  const phaseRaw = String(form.get("phase") || "").trim().toLowerCase();
  const defaultPhase: Phase | undefined = phaseRaw === "pre" ? "pre" : phaseRaw === "post" ? "post" : undefined;
  const dupRaw = String(form.get("duplicate_policy") || "reject").trim().toLowerCase();
  const duplicatePolicy: DuplicatePolicy = dupRaw === "overwrite" ? "overwrite" : "reject";

  const buf = new Uint8Array(await file.arrayBuffer());
  return { ok: true, bytes: buf, filename: file.name || "survey.csv", encoding, defaultPhase, duplicatePolicy };
}

// ────────────────────────────────────────────────────────────────
// POST /preview - 解析・検証のみ（DB書込みなし）
// ────────────────────────────────────────────────────────────────
surveyRouter.post("/preview", requireAuth, requireRoles(WRITE_ROLES), async (c) => {
  const parsed = await readCsvForm(c);
  if (!parsed.ok) return c.json(parsed.body, parsed.status as any);

  const { text, encoding } = decodeBytes(parsed.bytes, parsed.encoding);
  const { headers, records } = parseCsvToRecords(text);
  if (headers.length === 0) {
    return c.json({ success: false, error: "empty_csv", message: "CSVにヘッダ行がありません" }, 400);
  }

  const { mapping, unmatched } = buildHeaderMapping(headers);
  const { rows, columnErrors } = processRows(records, mapping, parsed.defaultPhase);

  const successRows = rows.filter((r) => r.ok).length;
  const failedRows = rows.length - successRows;

  return c.json({
    success: true,
    encoding,
    filename: parsed.filename,
    default_phase: parsed.defaultPhase || null,
    duplicate_policy: parsed.duplicatePolicy,
    headers,
    mapping,
    unmatched_columns: unmatched,
    column_errors: columnErrors,
    summary: { total: rows.length, success: successRows, failed: failedRows },
    // プレビューは先頭50行まで
    rows: rows.slice(0, 50).map((r) => ({
      row_index: r.row_index,
      research_id: r.research_id,
      phase: r.phase,
      ok: r.ok,
      errors: r.errors,
      response_count: r.responses.length,
    })),
  });
});

// ────────────────────────────────────────────────────────────────
// POST /commit - 取込確定（部分成功対応）
// ────────────────────────────────────────────────────────────────
surveyRouter.post("/commit", requireAuth, requireRoles(WRITE_ROLES), async (c) => {
  const db = c.env.DB as D1Database;
  if (!db) return c.json({ success: false, error: "db_unavailable" }, 503);
  const user = c.get("user");

  const parsed = await readCsvForm(c);
  if (!parsed.ok) return c.json(parsed.body, parsed.status as any);

  const { text, encoding } = decodeBytes(parsed.bytes, parsed.encoding);
  const { headers, records } = parseCsvToRecords(text);
  if (headers.length === 0) {
    return c.json({ success: false, error: "empty_csv", message: "CSVにヘッダ行がありません" }, 400);
  }

  const { mapping, unmatched } = buildHeaderMapping(headers);
  const { rows, columnErrors } = processRows(records, mapping, parsed.defaultPhase);

  // 必須列が無ければ全体失敗
  if (columnErrors.length > 0) {
    return c.json({ success: false, error: "column_validation_failed", column_errors: columnErrors }, 400);
  }

  const batchId = "sb_" + crypto.randomUUID();
  const now = new Date().toISOString();

  // バッチ + 生データを先に記録（原本保全）
  await db
    .prepare(
      `INSERT INTO survey_import_batches
        (id, filename, encoding, phase, duplicate_policy, total_rows, success_rows, failed_rows, skipped_rows, status, imported_by, imported_role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 'processing', ?, ?, ?)`,
    )
    .bind(
      batchId,
      parsed.filename,
      encoding,
      parsed.defaultPhase || "mixed",
      parsed.duplicatePolicy,
      rows.length,
      user?.id || "unknown",
      user?.role || "unknown",
      now,
    )
    .run();

  for (let i = 0; i < records.length; i++) {
    await db
      .prepare(`INSERT INTO survey_raw_rows (id, batch_id, row_index, raw_json) VALUES (?, ?, ?, ?)`)
      .bind("rr_" + crypto.randomUUID(), batchId, i, JSON.stringify(records[i]))
      .run()
      .catch(() => {});
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;
  const rowResults: { row_index: number; status: string; errors: any[] }[] = [];

  for (const r of rows) {
    if (!r.ok || !r.research_id || !r.phase) {
      failed++;
      rowResults.push({ row_index: r.row_index, status: "failed", errors: r.errors });
      continue;
    }

    // DB内の既存重複チェック
    const existing = await db
      .prepare(`SELECT COUNT(*) as cnt FROM survey_responses WHERE research_id = ? AND phase = ?`)
      .bind(r.research_id, r.phase)
      .first<{ cnt: number }>();
    const hasExisting = (existing?.cnt || 0) > 0;

    if (hasExisting && parsed.duplicatePolicy === "reject") {
      skipped++;
      rowResults.push({
        row_index: r.row_index,
        status: "skipped",
        errors: [{ code: "duplicate_exists", message: `既存データあり (研究ID=${r.research_id}/${r.phase})。上書きは無効です` }],
      });
      continue;
    }

    if (hasExisting && parsed.duplicatePolicy === "overwrite") {
      await db.prepare(`DELETE FROM survey_responses WHERE research_id = ? AND phase = ?`).bind(r.research_id, r.phase).run();
    }

    // 回答者メタ upsert
    await db
      .prepare(
        `INSERT INTO survey_respondents (research_id, phase, grade, school_type, ai_experience, consent, batch_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(research_id, phase) DO UPDATE SET
           grade=excluded.grade, school_type=excluded.school_type, ai_experience=excluded.ai_experience,
           consent=excluded.consent, batch_id=excluded.batch_id, updated_at=datetime('now')`,
      )
      .bind(
        r.research_id,
        r.phase,
        r.respondent.grade,
        r.respondent.school_type,
        r.respondent.ai_experience,
        r.respondent.consent,
        batchId,
      )
      .run();

    // 回答（縦持ち）
    for (const resp of r.responses) {
      await db
        .prepare(
          `INSERT INTO survey_responses (id, research_id, phase, item_id, value_raw, value_numeric, is_na, batch_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
           ON CONFLICT(research_id, phase, item_id) DO UPDATE SET
             value_raw=excluded.value_raw, value_numeric=excluded.value_numeric, is_na=excluded.is_na,
             batch_id=excluded.batch_id, updated_at=datetime('now')`,
        )
        .bind(
          "sr_" + crypto.randomUUID(),
          r.research_id,
          r.phase,
          resp.item_id,
          resp.value_raw,
          resp.value_numeric,
          resp.is_na ? 1 : 0,
          batchId,
        )
        .run()
        .catch(() => {});
    }

    success++;
    rowResults.push({ row_index: r.row_index, status: "success", errors: [] });
  }

  await db
    .prepare(
      `UPDATE survey_import_batches SET success_rows=?, failed_rows=?, skipped_rows=?, status='committed',
         error_summary=? WHERE id=?`,
    )
    .bind(success, failed, skipped, JSON.stringify({ unmatched_columns: unmatched }), batchId)
    .run();

  return c.json({
    success: true,
    batch_id: batchId,
    encoding,
    duplicate_policy: parsed.duplicatePolicy,
    summary: { total: rows.length, success, failed, skipped },
    unmatched_columns: unmatched,
    row_results: rowResults,
  });
});

// ────────────────────────────────────────────────────────────────
// GET /batches - 取込履歴
// ────────────────────────────────────────────────────────────────
surveyRouter.get("/batches", requireAuth, requireRoles(READ_ROLES), async (c) => {
  const db = c.env.DB as D1Database;
  if (!db) return c.json({ success: false, error: "db_unavailable" }, 503);
  const { results } = await db
    .prepare(`SELECT * FROM survey_import_batches ORDER BY created_at DESC LIMIT 200`)
    .all();
  return c.json({ success: true, batches: results });
});

// ────────────────────────────────────────────────────────────────
// GET /batches/:id - バッチ詳細
// ────────────────────────────────────────────────────────────────
surveyRouter.get("/batches/:id", requireAuth, requireRoles(READ_ROLES), async (c) => {
  const db = c.env.DB as D1Database;
  if (!db) return c.json({ success: false, error: "db_unavailable" }, 503);
  const id = c.req.param("id");
  const batch = await db.prepare(`SELECT * FROM survey_import_batches WHERE id = ?`).bind(id).first();
  if (!batch) return c.json({ success: false, error: "not_found" }, 404);
  const raw = await db
    .prepare(`SELECT row_index, raw_json FROM survey_raw_rows WHERE batch_id = ? ORDER BY row_index LIMIT 1000`)
    .bind(id)
    .all();
  const respondents = await db
    .prepare(`SELECT research_id, phase, grade, school_type, ai_experience, consent FROM survey_respondents WHERE batch_id = ?`)
    .bind(id)
    .all();
  return c.json({ success: true, batch, raw_rows: raw.results, respondents: respondents.results });
});

// ────────────────────────────────────────────────────────────────
// GET /analysis - 研究ID単位の事前事後突合 + 尺度・下位因子別集計
// ────────────────────────────────────────────────────────────────
surveyRouter.get("/analysis", requireAuth, requireRoles(READ_ROLES), async (c) => {
  const db = c.env.DB as D1Database;
  if (!db) return c.json({ success: false, error: "db_unavailable" }, 503);

  const { results } = await db
    .prepare(
      `SELECT research_id, phase, item_id, value_numeric, is_na
       FROM survey_responses WHERE value_numeric IS NOT NULL AND is_na = 0`,
    )
    .all<{ research_id: string; phase: string; item_id: string; value_numeric: number; is_na: number }>();

  // research_id -> phase -> {scale/subfactor -> 値配列}
  type Agg = Record<string, number[]>;
  const perRespondent: Record<string, { pre: Agg; post: Agg }> = {};

  for (const row of results) {
    const def = SURVEY_ITEM_INDEX[row.item_id];
    if (!def || !def.scale || !def.numeric) continue;
    // 逆転項目は分析時に逆転処理（6 - x、5件法）
    let v = row.value_numeric;
    if (def.reverse && def.max_value && def.min_value) {
      v = def.max_value + def.min_value - v;
    }
    const rid = row.research_id;
    const ph = row.phase === "pre" ? "pre" : "post";
    if (!perRespondent[rid]) perRespondent[rid] = { pre: {}, post: {} };
    const bucket = perRespondent[rid][ph as "pre" | "post"];
    const scaleKey = def.scale;
    const subKey = `${def.scale}::${def.subfactor || "_"}`;
    (bucket[scaleKey] ||= []).push(v);
    (bucket[subKey] ||= []).push(v);
  }

  const mean = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  // 対応のある（pre/post 両方ある）研究IDのみ突合対象
  const paired = Object.entries(perRespondent)
    .filter(([, v]) => Object.keys(v.pre).length > 0 && Object.keys(v.post).length > 0)
    .map(([rid, v]) => {
      const scales: Record<string, { pre: number | null; post: number | null }> = {};
      const keys = new Set([...Object.keys(v.pre), ...Object.keys(v.post)]);
      keys.forEach((k) => {
        scales[k] = { pre: mean(v.pre[k] || []), post: mean(v.post[k] || []) };
      });
      return { research_id: rid, scales };
    });

  return c.json({
    success: true,
    scales: SURVEY_SCALES.map((s) => ({ key: s, label: SURVEY_SCALE_LABELS[s] })),
    respondent_count: Object.keys(perRespondent).length,
    paired_count: paired.length,
    paired,
  });
});

export default surveyRouter;
