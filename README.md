# 教育実習日誌 評価プラットフォーム (teaching-practice-eval)

## 概要

教育実習日誌を取り込み、AI 評価 / 人間評価 / SCAT 質的コーディングを統合する研究支援プラットフォーム。論文出力 (APA 形式の記述統計表・相関行列・t 検定・Methods セクション自動生成 + 多重比較補正) までを単一の Web アプリで完結させる。

## URLs

- **本番 (main ブランチ)**: https://teaching-practice-eval.pages.dev
- **GitHub**: https://github.com/taka400h110-stack/teaching-practice-eval

## 技術スタック

- バックエンド: Hono (TypeScript) on Cloudflare Pages / Workers
- DB: Cloudflare D1 (SQLite, `teaching-practice-eval-db`)
- フロント: React + Material-UI v7 (`<Grid size={{...}}>` 構文)
- OCR: Markdown 変換ツールチェーン + Google Cloud Vision API
- AI 評価: OpenAI GPT 系 LLM
- ビルド: Vite + Wrangler

## エクスポート機能 (主要エンドポイント)

`/api/data/journal-imports/` 配下:

### 量的/質的データ
- `GET /export.csv` — サマリー CSV (19 列 / 一覧確認)
- `GET /export.detail.csv` — 質的分析向け詳細 (時限ブロック展開 + 原文)
- `GET /export.json` — NVivo / pandas 向けネスト JSON
- `GET /export.analysis.csv` — 量的分析統合 (日誌 + AI + 人間 + SCAT) 50 列

### Phase 6-3: 論文出力支援 (APA 形式)
- `GET /export.descriptive_stats.md` — APA 記述統計表 (M, SD, Mdn, Min/Max, 歪度, 尖度)
- `GET /export.correlation.csv` — Pearson 相関行列 (14 変数ペアワイズ, r/p/95% CI)
- `GET /export.t_test.md` — Welch 独立 t 検定 (週前半 vs 後半) + AI vs 人間 対応 t 検定
  - `split_week` — 群分け週 (デフォルト 4)
  - `correction` — 多重比較補正 (`none` / `bonferroni` / `holm` / `bh` ; Phase 7-4 で追加)
- `GET /export.methods_section.md` — 論文 Methods 7 サブセクション自動生成

### データ辞書
- `GET /export.codebook.json` — 機械可読 codebook
- `GET /export.codebook.md` — 論文 Appendix 用 codebook

### 共通フィルタ
- `student_id` / `from` (YYYY-MM-DD) / `to` (YYYY-MM-DD)
- summary/detail/json は追加で `status`, `q` (ファイル名 LIKE)

### UI: ExportMenu (Phase 7-5)
`JournalImportPage` のエクスポートメニューは 4 グループ構造 (ListSubheader 付):
1. **量的/質的データ** — CSV / Detail CSV / JSON / Analysis CSV
2. **APA 統計** — Descriptive / Correlation / t-test / Methods
3. **データ辞書** — Codebook (JSON / MD)
4. **多重比較補正セレクタ** — t-test エクスポート時に none/Bonferroni/Holm/BH-FDR を ToggleButtonGroup で選択

## データアーキテクチャ

- `journal_imports` — 取り込みファイルとステータス (uploaded_by が研究者スコープの基準)
- `journal_entries` — コミット後の日誌本体 (`student_id`, `entry_date`, `week_number`)
- `evaluations` (eval_type='ai') — AI 評価 (total + factor1..6) ※6因子40項目構造
- `human_evaluations` — 人間評価 (複数評価者を AVG で集約)
- `scat_segments` / `scat_codes` — SCAT 質的コーディング (step3 概念 / step4 テーマ)
- 全エクスポートは `audit_logs` に `resource_type='journal_import_export'` として記録

## 統計手法 (実装)

- 不偏標準偏差 (n−1), Fisher-Pearson 歪度 (g₁), 超過尖度 (g₂; SciPy `bias=False` 相当)
- Pearson 相関 + t 統計量による有意性検定 + Fisher z 変換 95% CI
- Welch 独立 t 検定 (Welch-Satterthwaite 自由度) + Cohen's d
- 対応のある t 検定 + Cohen's dz
- Student t 分布 CDF: 不完全ベータ関数 (Numerical Recipes 6.4 / Lanczos log Γ / Lentz 連分数)
- **多重比較補正** (Phase 7-4): Bonferroni / Holm step-down / Benjamini-Hochberg (BH-FDR)
  - `correctPValues()` / `parseCorrectionMethod()` / `formatCorrectionMethod()` を `src/api/utils/stats.ts` から提供
- **エッジケース表示** (Phase 7-3): SD=0 / n<2 / 完全相関 (r=±1) で skip 理由を機械可読にエクスポート
  - `StatsSkipReason`, `fmtCell`, `fmtPCell`, `formatSkipReason` ヘルパー
- **週番号バリデーション** (Phase 7-2): `week_number` の sanity check (1..52) + 異常レコードクリーンアップ migration
- 実装: `src/api/utils/stats.ts` (純 TypeScript / Cloudflare Workers 互換)

## 開発

```bash
# 依存導入とビルド
npm install
npm run build

# ローカル起動 (port 3000)
pm2 start ecosystem.config.cjs

# 型チェック (現在 0 件)
npx tsc --noEmit

# 本番デプロイ
npx wrangler pages deploy dist --project-name teaching-practice-eval --branch main
```

### D1 マイグレーション

```bash
# ローカル DB に適用
npx wrangler d1 migrations apply teaching-practice-eval-db --local

# 本番 DB に適用
npx wrangler d1 migrations apply teaching-practice-eval-db --remote

# 本番状態確認
npx wrangler d1 migrations list teaching-practice-eval-db --remote
```

## 開発履歴 (主要マイルストーン)

### Phase 6 (論文出力支援)
- **6-1**: codebook エンドポイント + 監査ログ拡張
- **6-2**: JournalImportPage を 1795→930 行に分割リファクタリング
- **6-3**: 論文出力支援 (APA 統計エクスポート 4 種)

### Phase 7 (統計品質強化)
- **7-2** (#5): `week_number` sanity validation + 異常レコードクリーンアップ migration (`0017_clean_abnormal_week_numbers.sql`)
- **7-3** (#6): 統計エッジケース表示 (SD=0 / n<2 / 完全相関)
- **7-4** (#7): 多重比較補正 (Bonferroni / Holm / BH-FDR)
- **7-5** (#8): ExportMenu グルーピング UI + t-test 補正セレクタ

### Phase 8 (技術的負債クリーンアップ)
- **8-1** (#9): 本番 D1 `d1_migrations` 履歴同期 (0014/0015/0016 を `INSERT OR IGNORE` で backfill 、`0018_sync_migrations_history.sql`)
- **8-2** (#10): `JournalImportPage.tsx:822` 未 import の `CircularProgress` を追加
- **8-3** (#11): tsc baseline cleanup (**49 → 0**)
  - `c.req.param("id")` を `string | undefined` として 400 ガード (Hono 型整合)
  - `apiFetch().json()` 明示呼び出し (SCAT 系 4 ファイル)
  - MUI v7 Grid 構文移行 (`<Grid item xs={...}>` → `<Grid size={{...}}>`)

### Phase 9 (6因子移行の完全化 + BFI個別フィードバック検証)
推奨順 A→F で重大/中度の不整合を厳密修正:
- **A** (重大): `LongitudinalAnalysisPage.tsx` を旧4因子→**6因子へ完全移行** (ラベル/カラー/折れ線/KPIカード/因子別推移/ペアt検定〔6因子＋総合 全7指標〕/CSV出力 f5・f6)
- **B** (重大): `EvaluationsPage.tsx` 評価テーブルに **F5/F6 列を追加** (ヘッダー Tooltip + 本文セル)。算出済みだが非表示だった問題を解消
- **C** (重大): `StatisticsPage.tsx` のハードコード4因子相関行列を **6因子データ駆動版** (`buildCorrelationMatrix()` + `rubric.ts` の interCorrelations 由来) に置換
- **D** (中): `StatisticsPage.tsx` 円グラフ「学校種別 参加分布」のラベル重なり修正 (ゼロ値除外 / 半径縮小 / Legend 凡例化)
- **E** (中): 学生データシード (`tests/audit/seed_students_bfi.py`) で **学生 1→4名** + 全学生に**完了済 BFI** を投入。N=1 制約 (空ヒストグラム/統計) を解消し、BFI 個別化を実証可能に
- **F** (中): 管理者ダッシュボードのユーザー数を実データ (`getRegisteredUsers()`) に修正 (`+5` ハック撤去、捏造の「DBレコード数」→「学生数」)

**Big Five 個別フィードバック検証 (初回ログイン→個人別フィードバック):**
- 初回ログイン (Onboarding Step2) で BFI 回答を `namikawa_bfi_responses` / `user_bfi_scores` に保存 → `/generate-goal` (`buildCoTCPrompt`) が誠実性≥3.5→High / 情緒不安定性≥3.5→Low / 開放性≥3.5→Medium と**目標難易度を個人別に調整**することを確認
- 統合分析 (`/bfi/integrated-analysis`, `buildBfiIntegratedPrompt`) が BFI×6因子評価から**個人別の深層フィードバック**を生成することを確認
- **致命バグ修正**: `data.ts` の統合分析/クロス群相関クエリ (旧 L3489 / L3576) が存在しない `journals` テーブルを `INNER JOIN` していた問題を `journal_entries` に修正。try/catch で黙殺され評価結合が常に空 (因子平均0) になっていた。修正により評価26件が結合され、N≥3 のクロスセクション・ピアソン相関 (5性格×〔総合+6因子〕) が初めて作動
- 全91→89ページ監査 (`tests/audit/full_role_page_audit.cjs`): **OK 89 / 問題 0**

### Phase 10 (学生別 AI対話ログ機能) (#20)
学生の生成AI（省察支援チャット）との対話ログを**一人ひとり記録**し、**他ロールが閲覧**できるようにした:
- **保存機能**: `ChatBotPage.tsx` の `sendMessage` で学生発言＋AI応答を都度 DB へ永続化 (`apiClient.saveChatMessage`)。リロードで消える問題を解消し、`student_id` を JWT から必ず記録
- **スキーマバグ修正**: `POST /chat-sessions/:journalId/messages` が存在しない `phase` 列へ挿入していた問題を、実テーブル定義 (`current_state` / `phase_reached`) に整合。入力検証 (role=user|assistant / content 必須)、セッション集計 (`total_turns` / `max_rd_chat_level`) 更新を追加
- **閲覧API**: `GET /chat-sessions` に `users` を LEFT JOIN し学生名・メール・メッセージ数を付加。学生は自分のセッションのみ (JWT id 強制)、特権ロール (教員/メンター/研究者/管理者/委員会) は全学生または指定学生を取得
- **詳細API**: `GET /chat-sessions/:journalId` の `current_state → phase` マッピング修正、messages を `{id, role, content, phase, reflection_depth, timestamp}` に整形
- **閲覧UI新設**: `StudentChatLogsPage.tsx` (`/student-chat-logs`) — 3ペイン構成 (学生選択 → セッション一覧 → 会話全文)。`AppLayout` のナビに教員/メンター/研究者/協力者/委員会/管理者向けリンク追加
- **シード/監査**: `tests/audit/seed_chat_logs.py` でデモログ 8 セッション / 64 メッセージ投入。監査スクリプトに `/student-chat-logs` を追加。検証スクリプト `tests/audit/verify_chat_logs_page.cjs` で UI レンダリング・ロール分離を確認
- CI: 必須4チェック (build / role-ui-smoke / export-filter-audit / statistics-validity-required) 全パス

## ライセンス / 引用

研究で使用する際は、エクスポート時の codebook と監査ログを保存し、論文 Methods に `exported_at`, `filters`, および補正手法 (`correction`) を記載することを推奨。SCAT は大谷 (2008) を引用。
