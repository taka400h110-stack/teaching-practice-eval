-- 0018_sync_migrations_history.sql
--
-- 履歴修復: 本番 D1 の d1_migrations テーブルに 0014/0015/0016 の行を補完する。
--
-- 背景:
--   Phase 7-2 で 0017_clean_abnormal_week_numbers.sql を `wrangler d1 migrations apply`
--   で本番に適用したが、その前に 0014/0015/0016 の実体は別経路 (手動実行 or
--   schema_pull など) で本番に当たっており、d1_migrations テーブル側だけが
--   追従していなかった。結果として本番の d1_migrations 履歴は
--     ... 0013 → 0017
--   と 3 件スキップした並びになっている (実体スキーマは正しい)。
--
--   この状態だと将来 0014/0015/0016 をうっかり再適用しようとしたとき
--   wrangler が "未適用" と判断して再実行を試み、CREATE TABLE/ALTER TABLE が
--   重複エラーで失敗するリスクがある。
--
-- このマイグレーションの内容:
--   d1_migrations テーブルに 0014/0015/0016 の行を name UNIQUE 制約で
--   INSERT OR IGNORE する。既に存在する場合 (= ローカル DB) は no-op。
--
-- 安全性:
--   - d1_migrations は wrangler 専用のメタデータテーブル。挿入してもアプリ動作には影響しない。
--   - applied_at は CURRENT_TIMESTAMP で記録 (実際の適用時刻は不明なため本日時刻で代用)。
--   - ローカル DB では既に 3 行存在するため INSERT OR IGNORE で skip され、no-op。
--   - 本番 DB ではこれら 3 行が補完され、以降 wrangler migrations list の表示と
--     実体スキーマが一致するようになる。
--
-- 検証手順 (適用後):
--   1. wrangler d1 migrations list teaching-practice-eval-db --remote
--      → 全 18 件が "applied" として表示されること
--   2. SELECT name FROM d1_migrations ORDER BY id
--      → 0001 ... 0018 が連続して並ぶこと (0002 が 2 つあるのは既存事情で許容)

INSERT OR IGNORE INTO d1_migrations (name, applied_at)
VALUES ('0014_add_journal_comments.sql', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO d1_migrations (name, applied_at)
VALUES ('0015_ism_sp_transmission.sql', CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO d1_migrations (name, applied_at)
VALUES ('0016_journal_imports.sql', CURRENT_TIMESTAMP);
