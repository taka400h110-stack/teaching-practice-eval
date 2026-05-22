/**
 * 過去日誌取り込み機能の共通ユーティリティ
 */
import type { StructuredJournal } from "./types";

export function humanFileSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 並列度を制限してファイルを順次アップロード
 */
export async function uploadWithConcurrency(
  files: File[],
  concurrency: number,
  uploadFn: (file: File) => Promise<{ ok: boolean; error?: string }>,
  onProgress: (done: number, total: number, errors: string[]) => void,
) {
  const total = files.length;
  let done = 0;
  const errors: string[] = [];
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;
      const r = await uploadFn(file);
      done += 1;
      if (!r.ok && r.error) errors.push(`${file.name}: ${r.error}`);
      onProgress(done, total, [...errors]);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);
  return errors;
}

export function safeJson<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function emptyStructured(): StructuredJournal {
  return {
    entry_date: null,
    week_number: null,
    title: null,
    blocks: {},
    reflection: null,
    confidence: 0.5,
    notes: null,
  };
}
