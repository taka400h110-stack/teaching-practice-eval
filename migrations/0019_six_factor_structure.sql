-- ════════════════════════════════════════════════════════════════
-- Migration 0019: 4因子23項目 → 6因子40項目 への拡張
-- 各評価テーブルに factor5_score / factor6_score を追加する。
-- 既存の factor1_score〜factor4_score は維持（意味は新6因子に再対応）。
-- ════════════════════════════════════════════════════════════════

-- AI評価（CoT-A）
ALTER TABLE evaluations ADD COLUMN factor5_score REAL;
ALTER TABLE evaluations ADD COLUMN factor6_score REAL;

-- 人間評価
ALTER TABLE human_evaluations ADD COLUMN factor5_score REAL;
ALTER TABLE human_evaluations ADD COLUMN factor6_score REAL;

-- 自己評価
ALTER TABLE self_evaluations ADD COLUMN factor5_score REAL;
ALTER TABLE self_evaluations ADD COLUMN factor6_score REAL;

-- 学習進捗スコア（縦断分析用）
ALTER TABLE learning_progress_scores ADD COLUMN factor5_score REAL;
ALTER TABLE learning_progress_scores ADD COLUMN factor6_score REAL;
