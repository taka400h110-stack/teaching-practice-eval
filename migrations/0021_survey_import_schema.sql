-- 0021_survey_import_schema.sql
-- Googleフォームで実施する事前事後アンケート（批判的思考態度CTA / 省察的思考RTQ /
-- 生成AI活用の批判的吟味AICT）の回答CSVを研究システムへ取り込むためのスキーマ。
--
-- 設計方針:
--   * 氏名・学籍番号は保持しない。research_id のみで実習前(pre)/実習後(post)を突合する。
--   * 元CSVの生データ(survey_raw_rows)を必ず保全し、正規化データ(survey_responses)は別テーブルに縦持ちする。
--   * 取込履歴(survey_import_batches)で「いつ・誰が・どのファイルを・何件」取り込んだか追跡する。
--   * 項目定義(survey_items)は原尺度準拠/翻案/独自(compliance_level)や逆転(reverse)などのメタ情報を保持する。
--   * 重複ポリシーは (research_id, phase, item_id) UNIQUE で担保し、既定は「拒否」、明示時のみ上書き。

-- ────────────────────────────────────────────────────────────────
-- 項目マスタ（Excel「最新版アンケート」72項目に対応）
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_items (
  item_id          TEXT PRIMARY KEY,            -- 例: CTA_LOG_01, RTQ_HAB_01, AICT_TRU_01
  category         TEXT NOT NULL,               -- 大分類（0.説明・同意 / 3.批判的思考態度 等）
  scale            TEXT,                        -- 尺度名（CTA / RTQ / AICT / META / FREE）
  subfactor        TEXT,                        -- 下位因子（論理的思考への自覚 等）
  question         TEXT NOT NULL,               -- 質問文
  response_type    TEXT NOT NULL,               -- likert5 / single / short / free / display / confirm
  required         INTEGER NOT NULL DEFAULT 1,  -- 1=必須, 0=任意
  phase            TEXT NOT NULL DEFAULT 'both',-- pre / post / both
  source           TEXT,                        -- 出典（平山・楠見(2004) 等）
  compliance_level TEXT,                         -- original(原尺度準拠) / adapted(翻案) / custom(独自)
  reverse          INTEGER NOT NULL DEFAULT 0,  -- 1=逆転項目（分析時に逆転処理）
  numeric          INTEGER NOT NULL DEFAULT 0,  -- 1=数値化対象（リッカート等）
  min_value        INTEGER,                     -- 数値化対象の下限（例: 1）
  max_value        INTEGER,                     -- 数値化対象の上限（例: 5）
  display_order    INTEGER NOT NULL DEFAULT 0,
  note             TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  updated_at       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_survey_items_scale ON survey_items(scale);

-- ────────────────────────────────────────────────────────────────
-- 取込履歴（バッチ）
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_import_batches (
  id             TEXT PRIMARY KEY,
  filename       TEXT,
  encoding       TEXT,                          -- 検出/指定した文字コード（utf-8 / shift_jis 等）
  phase          TEXT,                          -- このバッチの実施時点（pre / post / mixed）
  duplicate_policy TEXT NOT NULL DEFAULT 'reject', -- reject / overwrite
  total_rows     INTEGER NOT NULL DEFAULT 0,
  success_rows   INTEGER NOT NULL DEFAULT 0,
  failed_rows    INTEGER NOT NULL DEFAULT 0,
  skipped_rows   INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'committed', -- previewed / committed / failed
  error_summary  TEXT,
  imported_by    TEXT,                          -- 取込実行ユーザーID
  imported_role  TEXT,
  created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_survey_batches_created ON survey_import_batches(created_at);

-- ────────────────────────────────────────────────────────────────
-- 元CSV生データの保全（1行=1レコード）。研究再現性・監査のため原本を失わない。
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_raw_rows (
  id         TEXT PRIMARY KEY,
  batch_id   TEXT NOT NULL,
  row_index  INTEGER NOT NULL,                  -- CSV内の行番号（ヘッダ除く0始まり）
  raw_json   TEXT NOT NULL,                     -- {列名: 値} のJSON（原文そのまま）
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (batch_id) REFERENCES survey_import_batches(id)
);
CREATE INDEX IF NOT EXISTS idx_survey_raw_batch ON survey_raw_rows(batch_id);

-- ────────────────────────────────────────────────────────────────
-- 回答者メタ（研究ID単位、時点ごと）。基本情報（学年/校種/AI利用経験/同意）を保持。
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_respondents (
  research_id    TEXT NOT NULL,
  phase          TEXT NOT NULL,                 -- pre / post
  grade          TEXT,                          -- 大学2年生 / 大学3年生
  school_type    TEXT,
  ai_experience  TEXT,
  consent        INTEGER,                       -- 1=同意 0=非同意
  batch_id       TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  updated_at     TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (research_id, phase)
);

-- ────────────────────────────────────────────────────────────────
-- 正規化・縦持ち回答（分析の中核）。欠損値情報を is_na で保持し、値は原文と数値の両方を保存。
-- (research_id, phase, item_id) の一意制約で重複を担保。
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_responses (
  id            TEXT PRIMARY KEY,
  research_id   TEXT NOT NULL,
  phase         TEXT NOT NULL,                  -- pre / post
  item_id       TEXT NOT NULL,
  value_raw     TEXT,                           -- 原文の回答値（選択肢テキスト・自由記述など）
  value_numeric REAL,                           -- 数値化後（リッカート等。未数値化はNULL）
  is_na         INTEGER NOT NULL DEFAULT 0,     -- 1=欠損（未回答）
  batch_id      TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  UNIQUE(research_id, phase, item_id),
  FOREIGN KEY (batch_id) REFERENCES survey_import_batches(id)
);
CREATE INDEX IF NOT EXISTS idx_survey_resp_rid ON survey_responses(research_id, phase);
CREATE INDEX IF NOT EXISTS idx_survey_resp_item ON survey_responses(item_id);
