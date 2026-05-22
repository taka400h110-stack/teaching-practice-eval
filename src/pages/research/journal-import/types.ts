/**
 * 過去日誌取り込み機能の共通型・定数
 */

export interface ImportItem {
  id: string;
  uploaded_by: string;
  student_id: string | null;
  student_name?: string | null;
  filename: string;
  mime_type: string;
  file_size: number | null;
  status: string;
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

export interface Student {
  id: string;
  name: string;
  email?: string;
}

export interface StructuredJournal {
  entry_date: string | null;
  week_number: number | null;
  title: string | null;
  blocks: Record<string, string | undefined>;
  reflection: string | null;
  confidence: number;
  notes: string | null;
}

export const BLOCK_LABELS: Array<{ key: string; label: string }> = [
  { key: "block_morning", label: "朝の会" },
  { key: "block_p1", label: "1時限" },
  { key: "block_p2", label: "2時限" },
  { key: "block_p3", label: "3時限" },
  { key: "block_p4", label: "4時限" },
  { key: "block_lunch", label: "給食・昼" },
  { key: "block_p5", label: "5時限" },
  { key: "block_p6", label: "6時限" },
  { key: "block_cleaning", label: "清掃" },
  { key: "block_closing", label: "帰りの会" },
  { key: "block_after", label: "放課後" },
];

export const STATUS_COLORS: Record<string, "default" | "info" | "warning" | "success" | "error"> = {
  uploaded: "default",
  extracting: "info",
  extracted: "info",
  structuring: "info",
  structured: "warning",
  committing: "info",
  committed: "success",
  failed: "error",
};

export const STATUS_LABELS: Record<string, string> = {
  uploaded: "アップロード済",
  extracting: "抽出中…",
  extracted: "抽出完了",
  structuring: "構造化中…",
  structured: "編集待ち",
  committing: "コミット中…",
  committed: "✓ 確定済",
  failed: "✗ 失敗",
};

export const UPLOAD_CONCURRENCY = 3;
export const ITEMS_PER_PAGE = 200;
