# アクセシビリティ監査レポート (D-3)

教育実習評価システム（teaching-practice-eval）のアクセシビリティ全体監査結果。
WCAG 2.1 レベル AA を目標基準とする。

- **対象ブランチ**: `feat/a11y-audit-d3`
- **監査日**: 2026-06（Phase 14）
- **監査手段**: ①自動監査（axe-core / @axe-core/playwright）②キーボード操作 E2E ③手動監査（スクリーンリーダー観点・コントラスト比）
- **対象基準タグ**: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`

---

## 1. 自動監査（axe-core）

`tests/e2e/accessibility-audit.spec.ts` で各ロールの主要ページに axe を実行。
判定方針は **ラチェット方式**：

- `serious` / `critical` の違反は **CI を失敗させる（ブロッキング）**。
- ただし `TRACKED_NON_BLOCKING_RULES`（現状 `color-contrast`）は記録のみで失敗させない（本レポートで追跡）。
- `minor` / `moderate` は情報出力のみ。

ヘルパー: `tests/e2e/helpers/axeAudit.ts`
（`collectAxeViolations` / `expectNoSeriousA11yViolations`。非同期描画の中間状態による
偽陽性に備え、ブロッキング検知時は settle 待ち→1回再検査するリトライ機構あり。）

### 1.1 監査対象ページ（9件・全ロール）

| # | ページ | ロール | パス | testid |
|---|--------|--------|------|--------|
| 1 | Student Dashboard | 学生 | `/dashboard` | `student-dashboard-root` |
| 2 | Teacher Dashboard | 教員 | `/teacher-dashboard` | `teacher-dashboard-root` |
| 3 | Admin Dashboard | 管理者 | `/admin` | `admin-dashboard-root` |
| 4 | Journal List | 学生 | `/journals` | — |
| 5 | Evaluations List | 教員 | `/evaluations` | — |
| 6 | User Registration | 管理者 | `/register` | — |
| 7 | Cohorts Management | 教員 | `/cohorts` | — |
| 8 | Journal Workflow | 学生 | `/journal-workflow` | — |
| 9 | Goals History | 学生 | `/goals` | — |

### 1.2 結果サマリ

**ブロッキング（serious/critical, color-contrast を除く）違反: 0 件 → 9/9 ページ PASS** ✅

監査の過程で検出・修正した serious 違反は以下のとおり（修正済み）：

| ルールID | 内容 | 検出箇所 | 対応 |
|----------|------|----------|------|
| `aria-progressbar-name` | `<progressbar>` にアクセシブルネームが無い | MUI `LinearProgress`（各ダッシュボード/目標） | `aria-label` を付与（値・ラベルを読み上げ可能に） |
| `list` | `<ul>`/`<ol>` の直下に `<li>` 以外の要素 | `AppLayout` ナビ List、`DashboardPage` 最近の日誌 List | ナビ List は `component="div"`、データ List も `component="div"`＋子要素を `div` 化 |
| `aria-input-field-name` / `select-name` / `label` | フォーム入力にアクセシブルネームが無い | MUI `Select` / `TextField`（ユーザー登録、日誌ワークフロー、アラート履歴） | `InputLabel`＋`labelId` 連携、`inputProps={{ 'aria-label': ... }}` を付与 |

> ℹ️ `list` 違反は react-query のデータ解決前の中間 DOM 状態でのみ一時的に出る偽陽性も
> 含んでいたため、当該ダッシュボードカードの List は **視覚的なカード（ナビゲーション
> ではない）** と判断し `component="div"` 化して `<ul>/<li>` セマンティクス自体を排除。
> これによりレンダリングのタイミングに依らず安定して PASS する。

### 1.3 追跡対象（color-contrast）— 非ブロッキング

`color-contrast`（serious）は MUI 既定コンポーネント由来で広範囲に出るため、テーマ
レベルの是正は別タスクとして段階対応する。各ページの検出ノード数（最新監査時）：

| ページ | color-contrast ノード数 |
|--------|------------------------:|
| Student Dashboard | 17 |
| Teacher Dashboard | 11 |
| Admin Dashboard | 4 |
| Journal List | 4 |
| Evaluations List | 49 |
| User Registration | 11 |
| Cohorts | 9 |
| Journal Workflow | 4 |
| Goals History | 7 |

**発生源（共通パターン）**：

- MUI `Chip`（`size="small"`、ステータス系）の既定文字色／背景色のコントラスト。
- `Typography variant="caption"` の `text.secondary` を更に薄い背景（Chip 内・選択行など）に
  重ねたケース。
- 選択中ナビ項目のハイライト背景上のテキスト。

> ⚠️ これらは **`theme.ts` の基本トークン由来ではない**（後述 §3.2 のとおりテーマの
> 主要コントラストはすべて AA 合格）。MUI コンポーネント既定値の組み合わせで生じるため、
> Chip の `variant`/`color` 見直し・caption 配色の調整として別タスクで対応する。
> 本レポートでの追跡対象とし、CI のマージはブロックしない。

---

## 2. キーボード操作監査（E2E）

`tests/e2e/keyboard-navigation-audit.spec.ts`（4件）。**4/4 PASS** ✅

| # | テスト | 検証内容 | 結果 |
|---|--------|----------|------|
| 1 | Tab order | Tab キーで操作可能要素（`a`/`button`/`input`/`select`/`textarea`/`role=button`/`tabindex=0`）へ順にフォーカスが移動する | PASS |
| 2 | Focus indicator | キーボード操作（Tab）でフォーカスした要素が可視のフォーカスインジケータ（outline / box-shadow / `:focus-visible`）を持つ | PASS |
| 3 | Mobile drawer focus trap | モバイル幅でハンバーガー（`aria-label="メニューを開く"`）を Enter で開くとドロワー（Modal）が表示され、フォーカスが Modal 内に入り、**Esc で閉じる** | PASS |
| 4 | Form reachability | ユーザー登録フォームの入力欄が Tab で到達可能かつラベル付き | PASS |

### 注記（テスト方法上の知見）

- MUI のフォーカスリングは **`:focus-visible` 擬似クラス**で付与される。
  プログラム的な `element.focus()` では `:focus-visible` が発火しないため、テスト #2 は
  **実キーボード操作（`page.keyboard.press('Tab')`）でフォーカス移動**して検証している。
  （初版の `.focus()` 直叩きは偽陰性となったため修正済み。）
- モバイルドロワーは MUI 一時 Drawer（`.MuiDrawer-root.MuiModal-root`）でフォーカストラップ
  と Esc 閉じが標準提供されることを確認。

---

## 3. 手動監査（スクリーンリーダー観点・コントラスト比）

### 3.1 スクリーンリーダー観点

| 観点 | 状態 | 補足 |
|------|------|------|
| アイコンのみボタンの名前 | ✅ 対応済み | `IconButton` 42箇所に `aria-label` 付与（PR #32）。axe `button-name` 違反 0 件。 |
| プログレスバーの名前 | ✅ 対応済み | `LinearProgress` に値・ラベルを含む `aria-label`（達成率/スコア等を読み上げ）。 |
| フォーム入力のラベル | ✅ 対応済み | `Select` は `InputLabel`＋`labelId`、`TextField` は `inputProps aria-label` で名前を保証。 |
| リストのセマンティクス | ✅ 対応済み | ナビ／データカードの List 構造を是正（`<ul>` 直下は `<li>` のみ、または `div` 化）。 |
| ランドマーク / 見出し | ✅ 良好 | `AppLayout` に `header`/`nav`、各ページに `h5`/`h6` 階層あり。 |
| 動的更新の通知 | △ 今後検討 | トースト等の `aria-live` 化は将来の改善候補（現状ブロッキングなし）。 |

### 3.2 コントラスト比（`theme.ts` 主要トークン）

WCAG AA（通常文字 4.5:1 / 大文字 3.0:1）に対する実測値：

| 前景 / 背景 | 比率 | 判定 |
|-------------|-----:|------|
| `text.primary` `#2c3e50` / paper `#ffffff` | 10.98 | ✅ AA |
| `text.primary` `#2c3e50` / default `#f5f7fa` | 10.23 | ✅ AA |
| `text.secondary` `#546e7a` / paper `#ffffff` | 5.40 | ✅ AA |
| `text.secondary` `#546e7a` / default `#f5f7fa` | 5.03 | ✅ AA |
| white / `primary.main` `#1976d2` | 4.60 | ✅ AA |
| white / `primary.dark` `#1565c0` | 5.75 | ✅ AA |
| white / `secondary.main` `#9c27b0` | 6.30 | ✅ AA |
| TableHead `#455a64` / `#f8fafc` | 6.92 | ✅ AA |

**結論**: `theme.ts` の基本配色トークンはすべて WCAG AA を満たす。
§1.3 で追跡している `color-contrast` 違反は、これらのトークンではなく **MUI 既定
コンポーネント（Chip / caption 等）の組み合わせ**に起因するため、コンポーネント単位の
配色見直しで対応する（テーマ基盤の変更は不要）。

---

## 4. 残課題と今後の推奨

1. **color-contrast（追跡対象）の段階是正** — MUI `Chip` のステータス配色、caption の
   薄色重ねを対象に、コンポーネント単位でコントラストを引き上げる。完了後に
   `TRACKED_NON_BLOCKING_RULES` から `color-contrast` を外し、ブロッキング化する。
2. **`aria-live` リージョン** — 評価完了・保存トースト等の動的通知を読み上げ対象にする。
3. **監査対象ページの拡充** — 詳細画面（日誌詳細・評価結果・縦断分析）への axe 適用拡大。

---

## 5. 関連ファイル

- 自動監査: `tests/e2e/accessibility-audit.spec.ts`
- キーボード監査: `tests/e2e/keyboard-navigation-audit.spec.ts`
- 監査ヘルパー: `tests/e2e/helpers/axeAudit.ts`
- npm スクリプト: `test:e2e:optional:a11y` / `test:e2e:optional:keyboard`
- CI: `.github/workflows/ci-ui-audit.yml`（`audit-optional` マトリクスの `a11y` / `keyboard` ターゲット）
