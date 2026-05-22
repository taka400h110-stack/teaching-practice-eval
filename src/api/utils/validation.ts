/**
 * src/api/utils/validation.ts
 * 共通入力バリデーション (Phase 7-2)
 *
 * 主に week_number など、複数の API エンドポイントで重複していた
 * 値域チェックを集約する。例外を投げる代わりに ValidationError を返し、
 * 呼び出し側が HTTP 400 に変換できるよう設計している。
 */

/**
 * 週番号の許容範囲。
 *  - MIN: 1 (実習は 1 週目から)
 *  - MAX: 52 (1 年=52 週、研究目的の長期追跡でも実用上これで十分)
 *
 * Phase 7-2 以前は 88/99 など任意の整数が通っていたため、
 * 表示用ダッシュボードに混乱を招いていた。
 */
export const WEEK_NUMBER_MIN = 1;
export const WEEK_NUMBER_MAX = 52;

export type ValidationResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

/**
 * 週番号の検証。
 *
 * - 整数のみ許可 (3.5 などの少数は不可)
 * - 数値文字列 ('22') は数値に変換した上で許可
 * - null / undefined / NaN は不可
 * - WEEK_NUMBER_MIN..WEEK_NUMBER_MAX の範囲外は不可
 *
 * @param raw   外部から渡された任意の値
 * @param opts.allowNull  true の場合のみ null/undefined を許容し ValidationResult.value=NaN を返す
 *                        (journal_imports.week_number など NULL 可カラム用)
 */
export function validateWeekNumber(
  raw: unknown,
  opts: { allowNull?: boolean } = {},
): ValidationResult {
  if (raw === null || raw === undefined || raw === '') {
    if (opts.allowNull) return { ok: true, value: NaN };
    return { ok: false, error: 'week_number is required' };
  }

  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    return { ok: false, error: `week_number must be a number (got: ${JSON.stringify(raw)})` };
  }
  if (!Number.isInteger(n)) {
    return { ok: false, error: `week_number must be an integer (got: ${n})` };
  }
  if (n < WEEK_NUMBER_MIN || n > WEEK_NUMBER_MAX) {
    return {
      ok: false,
      error: `week_number must be between ${WEEK_NUMBER_MIN} and ${WEEK_NUMBER_MAX} (got: ${n})`,
    };
  }

  return { ok: true, value: n };
}

/**
 * Hono の context オブジェクトで使う便宜関数。
 * 例:
 *   const validated = requireWeekNumber(c, body.week_number);
 *   if (validated instanceof Response) return validated;
 *   // ここから先は validated は number 確定
 */
export type HonoLikeContext = {
  json: (body: unknown, status?: any) => Response;
};

export function requireWeekNumber(
  c: HonoLikeContext,
  raw: unknown,
  opts: { allowNull?: boolean } = {},
): number | Response {
  const result = validateWeekNumber(raw, opts);
  if (!result.ok) {
    return c.json({ error: 'validation_error', message: result.error }, 400);
  }
  return result.value;
}
