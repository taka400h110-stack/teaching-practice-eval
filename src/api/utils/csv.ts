/**
 * CSV パース + 文字コード判定ユーティリティ（Cloudflare Workers 安全 / 依存追加なし）
 *
 * - Node の iconv や fs は使わず、Web 標準の TextDecoder のみを利用する。
 * - Googleフォーム出力の UTF-8(BOM有/無) と、Excel 経由で保存されがちな Shift_JIS の双方に対応する。
 * - RFC 4180 準拠のパーサ（ダブルクォート内の改行・カンマ・"" エスケープを正しく扱う）。
 */

export type CsvEncoding = "utf-8" | "shift_jis";

/** BOM 有無・簡易ヒューリスティクスで文字コードを判定する */
export function detectEncoding(bytes: Uint8Array): CsvEncoding {
  // UTF-8 BOM
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return "utf-8";
  }
  // UTF-8 として妥当に復号できるか検査（不正シーケンスがあれば例外 → SJIS とみなす）
  try {
    const strict = new TextDecoder("utf-8", { fatal: true });
    strict.decode(bytes);
    return "utf-8";
  } catch {
    return "shift_jis";
  }
}

/** バイト列を、指定 or 自動判定した文字コードでデコードする */
export function decodeBytes(
  bytes: Uint8Array,
  encoding?: CsvEncoding,
): { text: string; encoding: CsvEncoding } {
  const enc = encoding || detectEncoding(bytes);
  // TextDecoder は "shift_jis" ラベルを WHATWG 標準として解釈する
  const decoder = new TextDecoder(enc, { fatal: false });
  let text = decoder.decode(bytes);
  // 先頭 BOM を除去
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return { text, encoding: enc };
}

/**
 * RFC 4180 準拠の CSV パーサ。
 * 返り値は行の配列で、各行はセル文字列の配列。空行は除去する。
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    // 全セルが空の行は除去
    if (!(row.length === 1 && row[0] === "")) {
      rows.push(row);
    }
    row = [];
  };

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushField();
      i++;
      continue;
    }
    if (ch === "\r") {
      // CRLF / CR
      if (text[i + 1] === "\n") i++;
      pushRow();
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // 末尾フィールド/行の取りこぼしを回収
  if (field !== "" || row.length > 0) {
    pushRow();
  }
  return rows;
}

/**
 * CSV テキストを { headers, records } に変換する。
 * records は各行を「ヘッダ名 -> 値」のオブジェクトにしたもの。
 */
export function parseCsvToRecords(text: string): {
  headers: string[];
  records: Record<string, string>[];
} {
  const rows = parseCsv(text);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });
    records.push(obj);
  }
  return { headers, records };
}
