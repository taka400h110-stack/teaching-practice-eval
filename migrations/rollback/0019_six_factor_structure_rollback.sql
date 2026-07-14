-- ════════════════════════════════════════════════════════════════
-- Rollback for Migration 0019: 6因子拡張 (factor5_score / factor6_score) の撤去
-- ════════════════════════════════════════════════════════════════
--
-- 対象: 0019_six_factor_structure.sql が ALTER TABLE ADD COLUMN で追加した
--       factor5_score / factor6_score を各評価テーブルから撤去する。
--
-- ⚠️ 重要な注意 (SQLite / D1 の制約):
--   SQLite は「ALTER TABLE ... DROP COLUMN」を古いバージョンでは未サポート。
--   Cloudflare D1 は比較的新しい SQLite を採用しており DROP COLUMN が使える場合が
--   あるが、バージョン差異・インデックス/ビュー依存により失敗する可能性がある。
--   そのため本ファイルは「DROP COLUMN 方式」を第一候補として記載しつつ、
--   失敗時の代替 (テーブル再作成方式) の指針をコメントで併記する。
--
-- ⚠️ データ影響:
--   factor5_score / factor6_score カラムを撤去すると、そこに保存済みの
--   6因子スコア (5因子目・6因子目) は完全に失われる。
--   本番でロールバックする前に必ず D1 のバックアップ (エクスポート) を取得すること。
--
-- ⚠️ コード整合:
--   現行アプリコード (src/api/routes/data.ts / src/api/client.ts) は
--   factor5_score / factor6_score を参照・書き込みしている。
--   このロールバックを本番に当てる場合、コードも 4因子時点へ戻す必要がある
--   (さもないと INSERT 時に "no such column" エラーになる)。
--   → 単独のスキーマロールバックは非推奨。コードと同時に切り戻すこと。
--
-- wrangler の migrations 履歴 (d1_migrations) はこのファイルでは操作しない。
-- 履歴の整合が必要な場合は別途 d1_migrations から該当行を手動削除すること。
-- ────────────────────────────────────────────────────────────────

-- 第一候補: DROP COLUMN 方式 (D1 が対応していれば最も安全・単純)
ALTER TABLE evaluations DROP COLUMN factor6_score;
ALTER TABLE evaluations DROP COLUMN factor5_score;

ALTER TABLE human_evaluations DROP COLUMN factor6_score;
ALTER TABLE human_evaluations DROP COLUMN factor5_score;

ALTER TABLE self_evaluations DROP COLUMN factor6_score;
ALTER TABLE self_evaluations DROP COLUMN factor5_score;

ALTER TABLE learning_progress_scores DROP COLUMN factor6_score;
ALTER TABLE learning_progress_scores DROP COLUMN factor5_score;

-- ────────────────────────────────────────────────────────────────
-- 代替方式 (DROP COLUMN が失敗する場合):
--   1. CREATE TABLE <name>_new (... factor5/6 を除いた旧スキーマ ...);
--   2. INSERT INTO <name>_new SELECT <factor5/6以外の全カラム> FROM <name>;
--   3. DROP TABLE <name>;
--   4. ALTER TABLE <name>_new RENAME TO <name>;
--   5. 依存するインデックス/トリガーを再作成。
-- 各テーブルで手動実施すること (FK 依存順に注意)。
-- ────────────────────────────────────────────────────────────────
