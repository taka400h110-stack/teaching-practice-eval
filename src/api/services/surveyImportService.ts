/**
 * アンケートCSV取込の中核ロジック（マッピング・バリデーション・数値化）。
 * D1 に依存しない純関数群としてまとめ、単体テスト・プレビュー・コミットで再利用する。
 */
import {
  SURVEY_ITEMS,
  SURVEY_ITEM_INDEX,
  type SurveyItemDef,
} from "../../constants/surveyItems";

export type Phase = "pre" | "post";
export type DuplicatePolicy = "reject" | "overwrite";

/** 列見出しの揺れを吸収するための別名辞書（項目ID / メタ項目） */
const HEADER_ALIASES: Record<string, string> = {
  // メタ項目の日本語見出し揺れ → 正規 item_id
  "研究id": "RESEARCH_ID",
  "研究ID": "RESEARCH_ID",
  "research_id": "RESEARCH_ID",
  "researchid": "RESEARCH_ID",
  "回答時点": "PHASE",
  "実施時点": "PHASE",
  "phase": "PHASE",
  "時点": "PHASE",
  "学年": "GRADE",
  "grade": "GRADE",
  "教育実習校種": "SCHOOL_TYPE",
  "校種": "SCHOOL_TYPE",
  "school_type": "SCHOOL_TYPE",
  "生成aiの利用経験": "AI_EXPERIENCE",
  "生成AIの利用経験": "AI_EXPERIENCE",
  "ai_experience": "AI_EXPERIENCE",
};

/** ヘッダ名を正規化キーへ変換（空白除去・小文字化しつつ item_id は大文字優先で照合） */
function normalizeHeaderKey(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toLowerCase();
}

/**
 * CSVヘッダ配列から「列名 -> item_id」のマッピングを構築する。
 * 1) 完全一致で item_id（大文字）に一致する列
 * 2) 別名辞書に一致する列
 * 3) 質問文の前方一致（Googleフォームは質問文が見出しになる）
 */
export function buildHeaderMapping(headers: string[]): {
  mapping: Record<string, string>; // header -> item_id
  unmatched: string[];
} {
  const mapping: Record<string, string> = {};
  const unmatched: string[] = [];

  // 質問文 -> item_id の索引（前方一致用）
  const questionIndex: { q: string; id: string }[] = SURVEY_ITEMS.map((it) => ({
    q: it.question.trim(),
    id: it.item_id,
  }));

  for (const h of headers) {
    const trimmed = h.trim();
    const upper = trimmed.toUpperCase();
    const normKey = normalizeHeaderKey(trimmed);

    // 1) item_id 完全一致
    if (SURVEY_ITEM_INDEX[upper]) {
      mapping[h] = upper;
      continue;
    }
    // 2) 別名辞書
    if (HEADER_ALIASES[trimmed] || HEADER_ALIASES[normKey]) {
      mapping[h] = HEADER_ALIASES[trimmed] || HEADER_ALIASES[normKey];
      continue;
    }
    // 3) 質問文の一致（完全一致 or 前方一致）
    const hit = questionIndex.find(
      (qi) => qi.q === trimmed || trimmed.startsWith(qi.q) || qi.q.startsWith(trimmed),
    );
    if (hit) {
      mapping[h] = hit.id;
      continue;
    }
    unmatched.push(h);
  }
  return { mapping, unmatched };
}

/** 実施時点の文字列を pre/post に正規化。判定不能なら null */
export function normalizePhase(value: string | undefined): Phase | null {
  if (!value) return null;
  const v = value.trim();
  if (/(実習前|事前|pre|before)/i.test(v)) return "pre";
  if (/(実習後|事後|post|after)/i.test(v)) return "post";
  return null;
}

/** リッカート等の数値化。先頭の数字を抽出し、範囲内なら採用 */
export function toNumericValue(
  def: SurveyItemDef,
  raw: string,
): { numeric: number | null; valid: boolean } {
  if (!def.numeric) return { numeric: null, valid: true };
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return { numeric: null, valid: true }; // 欠損は別途 is_na で扱う
  // "5" や "5: 非常に当てはまる" の先頭数値を抽出
  const m = trimmed.match(/-?\d+(\.\d+)?/);
  if (!m) return { numeric: null, valid: false };
  const num = Number(m[0]);
  if (Number.isNaN(num)) return { numeric: null, valid: false };
  if (def.min_value !== null && num < def.min_value) return { numeric: num, valid: false };
  if (def.max_value !== null && num > def.max_value) return { numeric: num, valid: false };
  return { numeric: num, valid: true };
}

export interface RowError {
  code: string;
  message: string;
}

export interface NormalizedResponse {
  item_id: string;
  value_raw: string;
  value_numeric: number | null;
  is_na: boolean;
}

export interface ProcessedRow {
  row_index: number;
  research_id: string | null;
  phase: Phase | null;
  respondent: {
    grade: string | null;
    school_type: string | null;
    ai_experience: string | null;
    consent: number | null;
  };
  responses: NormalizedResponse[];
  errors: RowError[];
  ok: boolean;
}

/**
 * 1行分の生レコード（ヘッダ名 -> 値）を、マッピングに基づき正規化・検証する。
 */
export function processRow(
  rowIndex: number,
  record: Record<string, string>,
  mapping: Record<string, string>,
  defaultPhase?: Phase,
): ProcessedRow {
  const errors: RowError[] = [];
  // header -> item_id で item_id -> value を作る
  const byItem: Record<string, string> = {};
  for (const [header, itemId] of Object.entries(mapping)) {
    byItem[itemId] = record[header] ?? "";
  }

  // 研究ID
  const research_id = (byItem["RESEARCH_ID"] || "").trim() || null;
  if (!research_id) {
    errors.push({ code: "missing_research_id", message: "研究IDが空です" });
  }

  // 実施時点
  let phase = normalizePhase(byItem["PHASE"]);
  if (!phase && defaultPhase) phase = defaultPhase;
  if (!phase) {
    errors.push({ code: "invalid_phase", message: "実施時点(実習前/実習後)が判定できません" });
  }

  // 回答者メタ
  const respondent = {
    grade: (byItem["GRADE"] || "").trim() || null,
    school_type: (byItem["SCHOOL_TYPE"] || "").trim() || null,
    ai_experience: (byItem["AI_EXPERIENCE"] || "").trim() || null,
    consent:
      byItem["CONSENT_AGREE"] !== undefined
        ? /同意する|agree|yes|1/i.test(byItem["CONSENT_AGREE"] || "")
          ? 1
          : (byItem["CONSENT_AGREE"] || "").trim() === ""
            ? null
            : 0
        : null,
  };

  // 各項目の正規化
  const responses: NormalizedResponse[] = [];
  for (const [itemId, rawVal] of Object.entries(byItem)) {
    const def = SURVEY_ITEM_INDEX[itemId];
    if (!def) continue;
    // メタ/表示/確認は回答値として保存しない（respondent 側で保持）
    if (["display", "confirm"].includes(def.response_type)) continue;
    if (["RESEARCH_ID", "PHASE", "GRADE", "SCHOOL_TYPE", "AI_EXPERIENCE", "CONSENT_AGREE"].includes(itemId)) {
      continue;
    }

    const raw = (rawVal ?? "").trim();
    const isNa = raw === "";

    if (def.numeric) {
      const { numeric, valid } = toNumericValue(def, raw);
      if (!isNa && !valid) {
        errors.push({
          code: "invalid_value",
          message: `${itemId}: 不正な値 "${raw}"（許容 ${def.min_value}〜${def.max_value}）`,
        });
      }
      responses.push({ item_id: itemId, value_raw: raw, value_numeric: numeric, is_na: isNa });
    } else {
      // 自由記述など：欠落なくそのまま保存
      responses.push({ item_id: itemId, value_raw: raw, value_numeric: null, is_na: isNa });
    }
  }

  return {
    row_index: rowIndex,
    research_id,
    phase,
    respondent,
    responses,
    errors,
    ok: errors.length === 0,
  };
}

/** 必須列（RESEARCH_ID / PHASE）がマッピングされているか検査 */
export function validateRequiredColumns(
  mapping: Record<string, string>,
  defaultPhase?: Phase,
): RowError[] {
  const mapped = new Set(Object.values(mapping));
  const errors: RowError[] = [];
  if (!mapped.has("RESEARCH_ID")) {
    errors.push({ code: "missing_column_research_id", message: "研究ID列(RESEARCH_ID)が見つかりません" });
  }
  if (!mapped.has("PHASE") && !defaultPhase) {
    errors.push({
      code: "missing_column_phase",
      message: "実施時点列(PHASE)が見つかりません。取込時に実施時点を指定してください",
    });
  }
  return errors;
}

/**
 * 全行を処理し、バッチ内の (research_id, phase) 重複も検出する。
 */
export function processRows(
  records: Record<string, string>[],
  mapping: Record<string, string>,
  defaultPhase?: Phase,
): {
  rows: ProcessedRow[];
  columnErrors: RowError[];
} {
  const columnErrors = validateRequiredColumns(mapping, defaultPhase);
  const rows = records.map((rec, idx) => processRow(idx, rec, mapping, defaultPhase));

  // バッチ内重複 (research_id + phase) の検出
  const seen = new Map<string, number>();
  rows.forEach((r) => {
    if (!r.research_id || !r.phase) return;
    const key = `${r.research_id}__${r.phase}`;
    if (seen.has(key)) {
      r.errors.push({
        code: "duplicate_in_batch",
        message: `同一CSV内で研究ID=${r.research_id} / ${r.phase} が重複しています`,
      });
      r.ok = false;
    } else {
      seen.set(key, r.row_index);
    }
  });

  return { rows, columnErrors };
}
