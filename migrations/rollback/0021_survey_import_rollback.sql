-- ============================================================
-- ロールバック: 0021_survey_import_schema.sql / 0022_seed_survey_items.sql
-- ------------------------------------------------------------
-- 用途: アンケートCSV取込機能(0021/0022)を適用後、問題が発生した
--       場合に survey_* テーブルを完全撤去して適用前状態へ戻す。
--
-- 注意:
--   - これらのテーブルは今回新規追加であり、既存テーブルとは
--     外部キーで接続していないため、DROP しても既存機能へ影響しない。
--   - 取込済みの調査回答データも全て削除される。実データ投入後に
--     ロールバックする場合は、事前に survey_* を必ずバックアップすること。
--   - d1_migrations テーブルの履歴削除は wrangler が管理するため、
--     手動での履歴巻き戻しは行わない（再適用は migrations apply で可能）。
--
-- 適用例(検証環境):
--   npx wrangler d1 execute DB --local \
--     --file=./migrations/rollback/0021_survey_import_rollback.sql
-- 本番で実行する場合は --local を外し、必ず事前バックアップを取得。
-- ============================================================

DROP INDEX IF EXISTS idx_survey_resp_item;
DROP INDEX IF EXISTS idx_survey_resp_rid;
DROP INDEX IF EXISTS idx_survey_raw_batch;
DROP INDEX IF EXISTS idx_survey_batches_created;
DROP INDEX IF EXISTS idx_survey_items_scale;

DROP TABLE IF EXISTS survey_responses;
DROP TABLE IF EXISTS survey_respondents;
DROP TABLE IF EXISTS survey_raw_rows;
DROP TABLE IF EXISTS survey_import_batches;
DROP TABLE IF EXISTS survey_items;
