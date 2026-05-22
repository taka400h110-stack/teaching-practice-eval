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
