/**
 * 過去日誌取り込みサービス
 *
 * Word (.doc/.docx) / PDF / 画像 から
 *   1) toMarkdown (Cloudflare Workers AI) でテキスト抽出
 *   2) GPT-4 で日誌スキーマ (日付/週/時限ブロック/省察) に構造化
 *   3) journal_entries に確定 INSERT
 *
 * 仕様:
 *   - 対応形式: PDF (テキスト+スキャン両対応, AI判定) / .docx / .doc /
 *               画像 (JPG/PNG/WEBP/SVG/HEIC) / その他 toMarkdown 対応形式
 *   - .doc は toMarkdown が対応していない可能性があるため、エラー時に専用メッセージ
 *   - HEIC は toMarkdown が非対応の可能性 → 画像扱いで Vision にフォールバック
 */
import type { D1Database } from "@cloudflare/workers-types";
import { callOpenAI } from "../routes/openai";

// ────────────────────────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────────────────────────
export interface ImportRecord {
  id: string;
  uploaded_by: string;
  student_id: string | null;
  filename: string;
  mime_type: string;
  file_size: number | null;
  status:
    | "uploaded"
    | "extracting"
    | "extracted"
    | "structuring"
    | "structured"
    | "committing"
    | "committed"
    | "failed";
  extract_source: string | null;
  raw_text: string | null;
  structured_json: string | null;
  journal_id: string | null;
  entry_date: string | null;
  week_number: number | null;
  word_count: number | null;
  token_count: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface StructuredJournal {
  entry_date: string | null; // yyyy-mm-dd
  week_number: number | null;
  title: string | null;
  blocks: {
    block_morning?: string;
    block_p1?: string;
    block_p2?: string;
    block_p3?: string;
    block_p4?: string;
    block_lunch?: string;
    block_p5?: string;
    block_p6?: string;
    block_cleaning?: string;
    block_closing?: string;
    block_after?: string;
  };
  reflection: string | null;
  confidence: number; // 0-1
  notes: string | null; // 抽出にあたっての注意事項
}

// ────────────────────────────────────────────────────────────────
// MIME 判定
// ────────────────────────────────────────────────────────────────
const MIME_DOC = "application/msword";
const MIME_DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MIME_PDF = "application/pdf";

const SUPPORTED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/heic",
  "image/heif",
]);

const TO_MARKDOWN_NATIVE_MIMES = new Set([
  MIME_PDF,
  MIME_DOCX,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.ms-excel.sheet.binary.macroenabled.12",
  "application/vnd.ms-excel",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.apple.numbers",
  "text/html",
  "application/xml",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

export function isSupportedMime(mime: string, filename?: string): boolean {
  if (TO_MARKDOWN_NATIVE_MIMES.has(mime)) return true;
  if (mime === MIME_DOC) return true; // toMarkdown 試行 → 失敗時案内
  if (SUPPORTED_IMAGE_MIMES.has(mime)) return true;
  // 拡張子フォールバック
  if (filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".doc") || lower.endsWith(".docx")) return true;
    if (lower.endsWith(".pdf")) return true;
    if (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".heic") ||
      lower.endsWith(".heif")
    )
      return true;
  }
  return false;
}

export function normalizeMime(mime: string, filename: string): string {
  if (mime && mime !== "application/octet-stream") return mime;
  const lower = filename.toLowerCase();
  if (lower.endsWith(".docx")) return MIME_DOCX;
  if (lower.endsWith(".doc")) return MIME_DOC;
  if (lower.endsWith(".pdf")) return MIME_PDF;
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".heic")) return "image/heic";
  if (lower.endsWith(".heif")) return "image/heif";
  return mime || "application/octet-stream";
}

// ────────────────────────────────────────────────────────────────
// 抽出本体: toMarkdown (Cloudflare Workers AI)
// ────────────────────────────────────────────────────────────────
export interface ExtractResult {
  rawText: string;
  source: "toMarkdown" | "vision" | "unsupported";
  tokens?: number;
}

export async function extractDocument(
  ai: any,
  visionKey: string | undefined,
  filename: string,
  mime: string,
  fileBuffer: ArrayBuffer,
): Promise<ExtractResult> {
  const normalized = normalizeMime(mime, filename);

  // 1) toMarkdown で抽出を試みる (PDF / docx / Office / 画像)
  if (ai && (TO_MARKDOWN_NATIVE_MIMES.has(normalized) || normalized === MIME_DOC)) {
    try {
      const result = await ai.toMarkdown({
        name: filename,
        blob: new Blob([fileBuffer], { type: normalized }),
      });
      // Cloudflare の戻り値は単一 or 配列
      const item = Array.isArray(result) ? result[0] : result;
      if (item && item.format === "markdown" && typeof item.data === "string") {
        return {
          rawText: item.data,
          source: "toMarkdown",
          tokens: item.tokens,
        };
      }
      if (item && item.format === "error") {
        // .doc が非対応の場合などはここに来る
        throw new Error(item.error || "toMarkdown returned error format");
      }
      throw new Error("toMarkdown returned unexpected result");
    } catch (err: any) {
      // .doc 失敗時 → 専用ガイダンスメッセージで上位に投げる
      if (normalized === MIME_DOC) {
        throw new Error(
          `旧形式 Word (.doc) の解析に失敗しました: ${err?.message || err}。` +
            ` Word で開き直して「名前を付けて保存 → .docx」として再アップロードしてください。`,
        );
      }
      // HEIC は Vision フォールバックを試す
      if (normalized === "image/heic" || normalized === "image/heif") {
        // ↓ Vision フォールバックへ
      } else {
        throw err;
      }
    }
  }

  // 2) HEIC など toMarkdown 非対応の画像 → Google Cloud Vision フォールバック
  if (SUPPORTED_IMAGE_MIMES.has(normalized) && visionKey) {
    const base64 = arrayBufferToBase64(fileBuffer);
    const visionResp = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${visionKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
              imageContext: { languageHints: ["ja", "en"] },
            },
          ],
        }),
      },
    );
    if (!visionResp.ok) {
      throw new Error(
        `Google Cloud Vision API error: ${visionResp.status} ${await visionResp.text()}`,
      );
    }
    const visionData: any = await visionResp.json();
    if (visionData.responses?.[0]?.error) {
      throw new Error(visionData.responses[0].error.message);
    }
    const text = visionData.responses?.[0]?.fullTextAnnotation?.text || "";
    return { rawText: text, source: "vision" };
  }

  // 3) どれにも該当しない
  throw new Error(
    `対応していないファイル形式です: ${normalized} (${filename})。` +
      ` 対応形式: PDF / Word (.docx 推奨) / 画像 (JPG/PNG/WEBP/HEIC) など。`,
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  return btoa(binary);
}

// ────────────────────────────────────────────────────────────────
// GPT-4 構造化プロンプト
// ────────────────────────────────────────────────────────────────
function buildStructurePrompt(rawText: string, filename: string): string {
  return `あなたは教育実習日誌の構造化アシスタントです。
以下の OCR/抽出済みテキストから、実習日誌として時間帯ブロックと省察を抽出し、
**厳密な JSON のみ** を返してください (前後の説明文・コードブロック禁止)。

入力ファイル名: ${filename}

入力テキスト:
"""
${rawText.slice(0, 8000)}
"""

期待スキーマ (必須キー):
{
  "entry_date": "yyyy-mm-dd or null",
  "week_number": "整数 or null (実習開始からの週番号、テキストに記載があれば)",
  "title": "日誌のタイトル or null",
  "blocks": {
    "block_morning": "朝の会の記述 or null",
    "block_p1": "1時限目の記述 or null",
    "block_p2": "2時限目 or null",
    "block_p3": "3時限目 or null",
    "block_p4": "4時限目 or null",
    "block_lunch": "給食・昼休み or null",
    "block_p5": "5時限目 or null",
    "block_p6": "6時限目 or null",
    "block_cleaning": "清掃 or null",
    "block_closing": "帰りの会 or null",
    "block_after": "放課後・部活 or null"
  },
  "reflection": "省察・振り返り全文 or null",
  "confidence": "0.0〜1.0 抽出全体の確信度",
  "notes": "抽出時の補足 (例: '日付がテキストに無い', '5時限以降が不明瞭' など) or null"
}

ルール:
- 該当する内容が無い時間帯は null
- 日付は yyyy-mm-dd 形式へ変換
- 漢数字や和暦は西暦に変換
- 該当ブロックの記述は元テキストのまま (大幅な書き換えはしない)
- 必ず JSON 1個だけを返す
`;
}

export async function structureWithGpt(
  apiKey: string,
  rawText: string,
  filename: string,
): Promise<StructuredJournal> {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY が設定されていません");
  }
  const prompt = buildStructurePrompt(rawText, filename);
  const raw = await callOpenAI(
    apiKey,
    [{ role: "user", content: prompt }],
    0.2,
    "gpt-4o",
  );

  // JSON 抽出 (前後にゴミがあっても取り出せるよう)
  const jsonStr = extractJsonObject(raw);
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(`GPT 構造化結果が JSON として解釈できません: ${e}`);
  }

  return {
    entry_date: typeof parsed.entry_date === "string" ? parsed.entry_date : null,
    week_number:
      typeof parsed.week_number === "number" ? parsed.week_number : null,
    title: typeof parsed.title === "string" ? parsed.title : null,
    blocks: parsed.blocks || {},
    reflection:
      typeof parsed.reflection === "string" ? parsed.reflection : null,
    confidence:
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
  };
}

function extractJsonObject(s: string): string {
  // ```json ... ``` を剥がす
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  // 最初の { から対応する } までを取る
  const start = s.indexOf("{");
  if (start < 0) return s.trim();
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return s.slice(start).trim();
}

// ────────────────────────────────────────────────────────────────
// 構造化結果 → 日誌本文 (journal_entries.content) JSON 文字列
// ────────────────────────────────────────────────────────────────
export function structuredToJournalContent(s: StructuredJournal): string {
  // 既存日誌スキーマと互換のある形式 (JSON 文字列)
  return JSON.stringify({
    title: s.title || "",
    block_morning: s.blocks.block_morning || "",
    block_p1: s.blocks.block_p1 || "",
    block_p2: s.blocks.block_p2 || "",
    block_p3: s.blocks.block_p3 || "",
    block_p4: s.blocks.block_p4 || "",
    block_lunch: s.blocks.block_lunch || "",
    block_p5: s.blocks.block_p5 || "",
    block_p6: s.blocks.block_p6 || "",
    block_cleaning: s.blocks.block_cleaning || "",
    block_closing: s.blocks.block_closing || "",
    block_after: s.blocks.block_after || "",
    reflection: s.reflection || "",
  });
}

export function estimateWordCount(s: StructuredJournal): number {
  const all = [
    s.title,
    ...Object.values(s.blocks || {}),
    s.reflection,
  ]
    .filter(Boolean)
    .join("\n");
  // 日本語混在の概算: 全長 (空白除く)
  return all.replace(/\s/g, "").length;
}

// ────────────────────────────────────────────────────────────────
// DB ヘルパ
// ────────────────────────────────────────────────────────────────
export async function createImportRecord(
  db: D1Database,
  rec: {
    id: string;
    uploaded_by: string;
    filename: string;
    mime_type: string;
    file_size: number;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO journal_imports (id, uploaded_by, filename, mime_type, file_size, status)
       VALUES (?, ?, ?, ?, ?, 'uploaded')`,
    )
    .bind(
      rec.id,
      rec.uploaded_by,
      rec.filename,
      rec.mime_type,
      rec.file_size,
    )
    .run();
}

export async function updateImportRecord(
  db: D1Database,
  id: string,
  patch: Partial<Omit<ImportRecord, "id" | "created_at">>,
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  for (const [k, v] of Object.entries(patch)) {
    fields.push(`${k} = ?`);
    values.push(v);
  }
  if (fields.length === 0) return;
  fields.push(`updated_at = datetime('now')`);
  values.push(id);
  await db
    .prepare(`UPDATE journal_imports SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function getImportRecord(
  db: D1Database,
  id: string,
): Promise<ImportRecord | null> {
  return (await db
    .prepare(`SELECT * FROM journal_imports WHERE id = ?`)
    .bind(id)
    .first()) as ImportRecord | null;
}
