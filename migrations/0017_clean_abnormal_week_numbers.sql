-- 0017_clean_abnormal_week_numbers.sql
-- Phase 7-2: 異常 week_number レコードのクリーンアップ + サニティチェック
--
-- 背景:
--   Phase 6 検証中に journal_entries テーブルへ week_number の異常値が混入していた。
--   調査結果 (2026-05-22 時点、本番 D1: teaching-practice-eval-db):
--     - week_number=88: 1 件   (id=2a47f8a9..., title='【監査テスト用】...', user-001)
--     - week_number=99: 3 件   (id=8a0d8690..., e4deb0c5..., 54c4a146..., 全て user-001)
--   どのレコードにも evaluations が紐付いている (合計 4 件)。
--   wk=88 のものには human_evaluations も 1 件あり。
--
-- 処理方針 (Phase 7-2 提案 b + 個別判断のハイブリッド):
--   1) wk=88 (id=2a47f8a9...): 監査テスト用と明示されたデータ → 物理削除
--      - 関連 evaluations / human_evaluations / human_eval_items も連鎖削除
--   2) wk=99 × 3 件: 内容は妥当な実習日誌だが week_number が異常
--      - entry_date が 2026-05-18/19/21 で、user-001 の既存 wk=22 (entry_date=2026-05-20)
--        と時期が重なるため wk=22 に補正
--      - UNIQUE(student_id, entry_date) の衝突は entry_date が異なるので発生しない
--      - 紐付いている evaluations は journal_id 経由で保持され、追加処理不要
--
-- 安全策:
--   - 本 migration は冪等にする (DELETE は明示的 id 指定、UPDATE は id IN (...) 指定)
--   - 既に削除済 / 既に補正済の場合は影響 0 行で完了する
--   - トランザクションでラップ (D1 は単一 SQL ファイルを 1 トランザクションで実行)

-- ─────────────────────────────────────────────────────────
-- ① wk=88 の監査テストレコードと関連評価を物理削除
--    本番事前計測 (2026-05-22) によると以下が連鎖削除される:
--      evaluations: 1, evaluation_items: 23,
--      human_evaluations: 1, human_eval_items: 4, journal_entries: 1
-- ─────────────────────────────────────────────────────────

-- 1-a. human_eval_items (human_evaluations を参照)
DELETE FROM human_eval_items
WHERE human_eval_id IN (
  SELECT id FROM human_evaluations
  WHERE journal_id = '2a47f8a9-8fca-4e72-8732-421bb0e3985d'
);

-- 1-b. human_evaluations
DELETE FROM human_evaluations
WHERE journal_id = '2a47f8a9-8fca-4e72-8732-421bb0e3985d';

-- 1-c. evaluation_items (evaluations を参照)
DELETE FROM evaluation_items
WHERE evaluation_id IN (
  SELECT id FROM evaluations
  WHERE journal_id = '2a47f8a9-8fca-4e72-8732-421bb0e3985d'
);

-- 1-d. evaluations (AI 評価)
DELETE FROM evaluations
WHERE journal_id = '2a47f8a9-8fca-4e72-8732-421bb0e3985d';

-- 1-e. journal_entries 本体
DELETE FROM journal_entries
WHERE id = '2a47f8a9-8fca-4e72-8732-421bb0e3985d';

-- ─────────────────────────────────────────────────────────
-- ② wk=99 の 3 件を wk=22 に補正 (内容と評価はそのまま保持)
-- ─────────────────────────────────────────────────────────
UPDATE journal_entries
SET week_number = 22,
    updated_at  = datetime('now')
WHERE id IN (
  '8a0d8690-b62f-4552-98e1-71eb6eb0ceef',
  'e4deb0c5-2367-464b-8a2b-3bef74a5f5c4',
  '54c4a146-b76a-4f5c-a6fb-4b8492367962'
)
AND week_number = 99;  -- 既に補正済みの場合は no-op
