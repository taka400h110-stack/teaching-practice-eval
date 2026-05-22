-- 0016_journal_imports.sql
-- 研究者用：過去の実習日誌の一括取り込み (Word/PDF/画像)
--
-- フロー:
--   1) /upload    : ファイル受領 → toMarkdown で抽出 → raw_text 保存 (status='extracted')
--   2) /structure : GPT-4 で日誌スキーマ (日付/週/時限ブロック/省察) に構造化 (status='structured')
--   3) /assign    : 学生 ID 紐付け (manual)
--   4) /commit    : journal_entries にINSERT (status='committed')

CREATE TABLE IF NOT EXISTS journal_imports (
  id              TEXT PRIMARY KEY,
  uploaded_by     TEXT NOT NULL,            -- 取り込んだ研究者 (users.id)
  student_id      TEXT,                     -- 紐付け先 (manual 設定。NULL の間はコミット不可)
  filename        TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  file_size       INTEGER,
  status          TEXT NOT NULL DEFAULT 'uploaded',
                  -- uploaded / extracting / extracted / structuring / structured /
                  -- committing / committed / failed
  extract_source  TEXT,                     -- 'toMarkdown' / 'vision' / 'unsupported'
  raw_text        TEXT,                     -- toMarkdown 出力 (Markdown形式)
  structured_json TEXT,                     -- GPT-4 構造化結果 (entry_date, week, blocks{...}, reflection)
  journal_id      TEXT,                     -- コミット後 journal_entries.id
  entry_date      TEXT,                     -- 構造化された日付 (yyyy-mm-dd)
  week_number     INTEGER,
  word_count      INTEGER,
  token_count     INTEGER,                  -- toMarkdown が返す概算トークン数
  error_message   TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_journal_imports_uploaded_by  ON journal_imports(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_journal_imports_status       ON journal_imports(status);
CREATE INDEX IF NOT EXISTS idx_journal_imports_student      ON journal_imports(student_id);
CREATE INDEX IF NOT EXISTS idx_journal_imports_created_at   ON journal_imports(created_at);
