-- 0015_ism_sp_transmission.sql
-- ISM / SP表 / 伝達係数 のためのテーブル
-- 仕様: docs/analysis/scat_to_ism_pipeline.md

-- ────────────────────────────────────────────────
-- analysis_state: SCAT 連動派生分析の整合性管理
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_state (
  scope TEXT PRIMARY KEY,                    -- "global" | "course:<id>" | "cohort:<id>"
  scat_network_hash TEXT,                    -- 最新の SCAT ネットワーク構造ハッシュ
  ism_computed_at DATETIME,
  ism_dirty INTEGER NOT NULL DEFAULT 1,      -- 初期は dirty (未計算)
  sp_computed_at DATETIME,
  sp_dirty INTEGER NOT NULL DEFAULT 1,
  transmission_computed_at DATETIME,
  transmission_dirty INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ────────────────────────────────────────────────
-- ism_analyses: ISM 計算結果のキャッシュ
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ism_analyses (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,                       -- analysis_state.scope と対応
  source_hash TEXT NOT NULL,                 -- 計算時の SCAT ネットワーク ハッシュ
  elements_json TEXT NOT NULL,               -- [{"id":"e1","label":"..."}, ...]
  adjacency_json TEXT NOT NULL,              -- number[n][n]
  reachability_json TEXT NOT NULL,           -- number[n][n]
  levels_json TEXT NOT NULL,                 -- string[][]  (例: [["e4"],["e3","e5"],["e1","e2"]])
  transmission_score REAL,                   -- 伝達係数 T (0..1)
  node_count INTEGER NOT NULL DEFAULT 0,
  edge_count INTEGER NOT NULL DEFAULT 0,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  computed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_ism_analyses_scope ON ism_analyses(scope);

-- ────────────────────────────────────────────────
-- sp_tables: S-P 表のキャッシュ
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sp_tables (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  students_json TEXT NOT NULL,               -- [{"id":"u-001","name":"..."}, ...]
  problems_json TEXT NOT NULL,               -- [{"id":"e1","label":"..."}, ...]
  matrix_json TEXT NOT NULL,                 -- number[n][m]  (0/1)
  student_caution_json TEXT,                 -- number[n] | null
  problem_caution_json TEXT,                 -- number[m] | null
  student_count INTEGER NOT NULL DEFAULT 0,
  problem_count INTEGER NOT NULL DEFAULT 0,
  computed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  computed_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_sp_tables_scope ON sp_tables(scope);

-- ────────────────────────────────────────────────
-- 初期データ: global スコープ
-- ────────────────────────────────────────────────
INSERT OR IGNORE INTO analysis_state (scope, ism_dirty, sp_dirty, transmission_dirty)
VALUES ('global', 1, 1, 1);
