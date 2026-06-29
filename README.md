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

### AI評価の環境変数 (OpenAI / OpenAI互換エンドポイント)

AI評価・対話・SCAT分析は OpenAI Chat Completions API を利用します。エンドポイントとモデルは環境変数で切り替え可能で、**未設定時は OpenAI 公式 (`https://api.openai.com/v1` / `gpt-4o`) を既定**とするため、既存の本番デプロイは無設定のまま従来通り動作します。

| 変数 | 必須 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | ✅ | — | API キー。未設定時は AI 機能が `503 AI_NOT_CONFIGURED` を返す |
| `OPENAI_BASE_URL` | 任意 | `https://api.openai.com/v1` | OpenAI 互換エンドポイントのベースURL。末尾に `/chat/completions` を付与して呼び出す |
| `OPENAI_MODEL` | 任意 | `gpt-4o` | 使用モデル。GenSpark LLM プロキシ等では `gpt-5-mini` 等を指定 |

```bash
# ローカル開発 (.dev.vars — gitignore 済み、コミット禁止)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://www.genspark.ai/api/llm_proxy/v1   # 省略時は OpenAI 公式
OPENAI_MODEL=gpt-5-mini                                     # 省略時は gpt-4o

# 本番 (Cloudflare Pages secrets)
npx wrangler pages secret put OPENAI_API_KEY --project-name teaching-practice-eval
# OPENAI_BASE_URL / OPENAI_MODEL は wrangler.jsonc の vars もしくは secret で設定
```

> **注意 (reasoning モデル)**: gpt-5 系の reasoning モデルは `reasoning_tokens` を completion 枠から消費するため、`callOpenAI` の既定 `max_tokens` を 16384 に設定しています。これにより 40 項目の CoT-A 評価 JSON が途中で切れずに生成されます。

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

### Phase 11 (全機能QA監査 — チャット履歴の不具合修正) (#22)
全機能・UI・ページレイアウトの厳密検証を実施し、発見した課題を修正:
- **`/chat` 行き止まり解消**: 学生ナビ「チャット履歴」(`/chat`、journalId 未指定) が「日誌IDが指定されていません」だけの空白ページになる問題を修正。**セッション選択ランディング** (対話セッション一覧) を表示し、既存セッションのクリックで該当チャットへ遷移、履歴が無ければ日誌一覧へ誘導
- **React フック規則違反の解消**: `ChatBotPage.tsx` の早期 `return` が `useState`/`useQuery` 群より前にあった問題を修正。全フックを無条件に先頭で実行し、`session` 取得は `enabled: !!journalId` に
- **セッション切替クラッシュ修正**: 履歴ダイアログ/ピッカーが一覧API (messages 配列を返さず `message_count` を返す) に対し `s.messages[...].length` を参照して「システムエラー」になっていた問題を、オプショナルチェーン＋`message_count` フォールバックで修正
- **QA監査結果**: tsc EXIT 0 / build 成功 / 全ロール×95ページ監査 **OK 95・問題0** / RBAC 6ケース全正常 / コンソール・ネットワーク監査 CLEAN / 横スクロール溢れ無し
- **QAテスト追加**: `console_error_audit.cjs` (コンソール/ネットワークエラー検出)、`verify_chat_picker.cjs` (セッションピッカー＆遷移)、`verify_rbac_chat.cjs` (UI RBAC)、`shot_audit.cjs` (スクショ＋横溢れ検出)
- CI: 必須4チェック全パス＋オプション3チェック (mobile / provider-health / stats-malformed) 全パス

### Phase 12 (教育実習日誌コア機能の致命バグ修正＋性能/UX改善) (#24)
中核機能である**教育実習日誌の提出フロー**を厳密に E2E 検証し、提出を壊していた**致命的バグ2件**を発見・修正:
- **🔴 新規提出が下書き扱いになり AI評価が起動しない**: `createJournal` (client.ts) が `status:"draft"` / `entry_date:今日` をハードコードで上書きしており、「提出してAI評価へ」を押しても draft で保存され自動評価パイプラインが起動しなかった問題を修正。呼び出し側 (`handleSave`) の値を尊重するように変更
- **🔴 編集モードの提出が必ず 500 で失敗**: `PUT /journals/:id` が body 全フィールドを動的に SET 句にしていたため、`reflection_text` / `title` など `journal_entries` に存在しないカラムで `D1_ERROR: no such column` → 500。**既存日誌を開いて draft→submitted する操作が全て失敗していた**。実カラムのホワイトリストでフィルタし `updated_at` も更新するよう修正
- **二重 AI 評価の防止**: `saveMutation.onSuccess` で `auto_pipeline_triggered` を確認し、バックエンドが評価済みならクライアント側の再評価を行わない
- **404 ノイズ除去**: `GET /chat-sessions/:journalId` をセッション未作成時 404 → **200+空セッション**に変更
- **SCAT 生 JSON 露出修正**: フォールバック storyline で生の content (`{"version":2,...}`) が露出していた問題を `extractJournalText` で本文抽出するよう修正
- **「実習日」明確化**: 日付ラベルを「記入日」との混同を避け「実習日」に統一 (JournalWorkflow / JournalEditor)、補助テキスト追加
- **⚡ バンドル大幅軽量化**: client build を `minify:false→esbuild` + `manualChunks` で react/MUI/recharts/tanstack を vendor 分割。**初期 index チャンク 1,332KB → 48.6KB (gzip 266→13.6KB、約95%削減)**、recharts はチャート非使用ページで読み込まれない
- **🎨 共通状態表示**: `StateViews.tsx` (LoadingView / ErrorView / EmptyView) を新規追加し、ローディング・エラー（再試行ボタン付き）・空状態（アクション付き）の見た目を統一。`JournalListPage` に適用。コマ操作 IconButton に `aria-label` 付与 (A11y)
- **E2E テスト追加**: `verify_journal_submit.cjs` (新規提出: status:submitted・実習日尊重・snackbar・クリーン)、`verify_journal_edit_koma.cjs` (コマ追加/削除/並び替え・draft保存→body復元→編集提出 draft→submitted)
- CI: 必須4チェック全パス＋オプション3チェック全パス

### Phase 13 (共通状態表示の全ページ横展開 — UX統一) (#25)
Phase 12 で導入した共通状態表示コンポーネント `StateViews` (LoadingView / ErrorView / EmptyView) を、全役割の主要ページへ横展開し、ローディング・エラー・空状態の体験を統一:
- **取得失敗時の操作不能を解消**: これまで取得失敗時に何も表示されず操作不能になっていたページへ、**エラー表示＋再試行ボタン**を追加
- **ローディング表記の統一**: 全ページで中央スピナー＋ラベル (role=status / aria-live) に統一
- **適用ページ (計18ページ)**:
  - 学生/教員ダッシュボード・日誌一覧 (Phase 12 で先行適用)
  - 評価一覧 / 統計 / コホート管理 / 縦断分析 / 教員統計 / 成長可視化: `LoadingView` + 再試行付き `ErrorView`
  - 学生別AI対話ログ: Loading/Error/Empty を完全統一
  - SCAT概念ネットワーク / SCAT時系列 / プラットフォーム分析: ローディング表記統一
  - 評価結果 / 日誌詳細: ローディングを `LoadingView` へ、日誌詳細は再試行付き `ErrorView` 化
  - 研究系: ISM分析 / S-P表分析 / 伝達構造分析 / SCAT分析 / 日誌取り込み一覧 / 日誌取り込み詳細
- **コード整理**: 未使用となった `CircularProgress` / `LinearProgress` の import を削除
- **方針**: AI評価実行ボタンや「記録が見つかりません(戻る導線付き)」等のドメイン固有UIは破壊せず維持。フォールバックデータを持つページはローディング表記のみ統一
- CI: 必須4チェック全パス

### Phase 14 (モバイル/A11y 改善 + AI評価実機確認) (#30, #31)
- **📱 モバイル横スクロール解消 (#30)**: `AppLayout` の `<main>` Box が flex-item の既定 `min-width:auto` のため幅375pxで縮まず横溢れしていた問題を `minWidth:0` (+ `maxWidth:100%` / `overflowX:hidden`) で解消。Dashboard / JournalWorkflow / JournalList / GrowthViz の4ページの溢れを一括修正。成長可視化の Tabs を `variant="scrollable"` 化。E2E モバイル溢れテスト 6件追加 (9/9 PASS)
- **🛡️ AI評価エラーハンドリング (B-2) (#30)**: API キー未設定時を `500 → 503 + code:AI_NOT_CONFIGURED` に変更。`runEvaluation` (client.ts) が具体的エラーを保持して再throw。`JournalWorkflowPage` の AI タブに警告/エラー Alert + **再試行ボタン**を追加
- **🤖 OpenAI互換エンドポイント対応 + reasoning対応 (D-2) (#31)**: AI評価フローを OpenAI 互換プロキシ (GenSpark LLM proxy / gpt-5-mini) で実機確認する過程で発見した2バグを修正。(1) エンドポイント/モデルを `OPENAI_BASE_URL` / `OPENAI_MODEL` で env 駆動化（既定は OpenAI 公式で後方互換）。(2) gpt-5 系 reasoning モデルの `reasoning_tokens` 消費で 40項目 JSON が切れる問題を `max_tokens` 4096→16384 で解消。`/api/ai/evaluate` `/chat` `/reflection-depth` すべて HTTP 200 で実機確認済み

## ライセンス / 引用

研究で使用する際は、エクスポート時の codebook と監査ログを保存し、論文 Methods に `exported_at`, `filters`, および補正手法 (`correction`) を記載することを推奨。SCAT は大谷 (2008) を引用。
