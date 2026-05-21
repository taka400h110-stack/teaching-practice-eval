# 評価者ロール: 4因子評価 vs 23項目評価の設計衝突

**Status**: ✅ **RESOLVED (2026-05-21)** — 仕様確定 (`docs/evaluation_model.md` に正式仕様)
**Priority**: Medium (UX/データ整合性に関わる重要な意思決定が必要だった)
**Identified**: 2026-05 (evaluator ロール監査)
**Resolved**: 2026-05-21 (ユーザによる仕様明示)
**Affected Role**: `evaluator`
**Affected Pages**: `/evaluations`, `/evaluations/:journalId`, `/evaluations/:journalId/human`, `/reliability`, `/comparison`

---

## 確定された仕様 (2026-05-21)

ユーザ指示により、以下が **正式仕様** として確定:

> ICCなどの分析は AI が **23項目** を一つずつ評価し因子ごとに平均化、
> 人による評価は **4因子** を評価、平均化したものと、
> 人は複数人の平均または個人を値として分析する。

### 結論

| 軸 | 主体 | 入力粒度 | 集計 |
|---|---|---|---|
| **AI** | OpenAI による評価 | **23 項目を 1 項目ずつ** | 因子ごとに**平均**して 4 因子スコア化 |
| **人** | 評価者 (`evaluator` ロール等) | **4 因子を直接** | 複数人なら**平均**、個人なら個人値 |
| **ICC** | AI vs 人 | **4 因子レベルで比較** | 因子別 + 全体 |

監査時に書いた 「21項目」は **誤記**。コードベースでは一貫して **23項目** (`src/constants/rubric.ts` の `RUBRIC_FACTORS[].itemRange` の合計 7+6+4+6 = 23)。

正式仕様: **`docs/evaluation_model.md`** を参照。

---

## 監査時の症状記録 (アーカイブ)

### 1. UI 上の混在 (実装の現状)
- `HumanEvaluationPage` (`/evaluations/:journalId/human`) で 4因子と 23項目の両方の入力フォームが提示される
- 評価入力フォーム内で、上位 4因子の点数と下位 23項目の点数が独立に編集可能で、合計値・平均値の関係が UI 上で示されていない
- `ComparisonPage` (`/comparison`) ではどちらの粒度で比較するかをユーザが選択できない

### 2. API レイヤの混在
- `POST /api/data/human-evals` の `items[]` が、因子の id を含むレコードと項目の id を含むレコードを同列に受け付ける
- データベース上 `human_eval_items` テーブルは粒度の区別を `category` か `item_id` で行っているが、フロントエンドの送信ペイロードでは粒度が暗黙化されている

### 3. 統計指標の不整合
- ICC (`POST /api/data/icc-results`) の `factor` フィールドが「4因子の名前」を期待する箇所と「23項目の id」を期待する箇所が混在

### 4. ドキュメント不在 (本ファイル作成で解消)
- 4因子と 23項目の正式な定義 → `src/constants/rubric.ts` および `docs/evaluation_model.md` で集約

---

## 解消アクション

### ✅ 完了

- [x] **仕様確定**: `docs/evaluation_model.md` 作成 (確定仕様の単一情報源)
- [x] **本 Issue を Resolved に**: 上記決定を本ファイル冒頭に記載
- [x] **入力バリデーション強化**: `POST /human-evals` で `items` 必須・配列化を 400 で返す

### 🔜 残作業 (別タスク)

- [ ] **UI 改修**: `HumanEvaluationPage` から 23項目入力欄を撤去、4因子のみに簡素化
- [ ] **サーバ側バリデーション強化**:
  - `human-evals.items.length === 4` を必須化
  - `items[].factor` を `factor1|factor2|factor3|factor4` に限定
  - `items[].score` を 1–5 整数に限定
- [ ] **ICC 計算ロジック**: `factor` が 4因子のみを受け取るよう改修、項目 ID は廃止
- [ ] **既存データのマイグレーション**:
  - `human_eval_items` で項目 ID を持つレコードを因子に集約 (平均化)
  - `icc_results.factor` の非正規値を正規化
- [ ] **テスト**: 4因子 ICC の単体テストを追加 (`tests/unit/icc.spec.ts`)

---

## 関連ファイル

- `src/api/routes/data.ts` — `POST /human-evals`, `POST /icc-results`
- `src/api/routes/openai.ts` — AI による 23 項目評価 (`POST /evaluate`)
- `src/constants/rubric.ts` — 4因子 23項目の正式定義 (single source of truth)
- `src/pages/HumanEvaluationPage.tsx` — 評価入力フォーム (改修対象)
- `src/pages/EvaluationResultPage.tsx` — 評価結果表示
- `src/pages/ComparisonPage.tsx` — AI vs Human 比較
- `src/pages/ReliabilityAnalysisPage.tsx` — 信頼性分析
- `docs/evaluation_model.md` — 確定仕様 (本 Issue の解決によって作成)
- `docs/audit/role_evaluator.md` — 監査レポート (本問題の発見記録)

---

## 補足: 監査時の所見

evaluator ロール監査 (2026-05) において、`/evaluations` 一覧に表示される件数（4 件）と `/reliability` 集計の対象件数（多数）の差が、本問題の症状の一つとして観測された。
これは Playwright での自動検証時、`table tbody tr` のカウントが Material UI Card 構造とは合わず、別途 `data-testid` ベースの確認が必要となった件とも関連する。
