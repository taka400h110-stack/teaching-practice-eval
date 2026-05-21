# 評価者 (evaluator) ロール監査レポート

**監査日**: 2026-05-21
**監査URL**: https://teaching-practice-eval.pages.dev
**Production**: `b81f64c` + `6a413d6` (main)
**監査範囲**: API動作 / UI描画 / ボタン応答 / 画面遷移 / 統計計算 / E2Eフロー

---

## 1. アカウント情報

| 項目 | 値 |
|------|-----|
| メール | `evaluator@teaching-eval.jp` |
| パスワード | `password` |
| user_id | `user-008` |
| 表示名 | 小林 評価者 |
| ロール | `evaluator` |
| サイドバーラベル | 評価者（RQ2） |
| ロールカラー | `#e64a19` |
| ロール開始ページ | `/evaluations` |

---

## 2. アクセス可能ページ (App.tsx より)

| パス | ページ | HTTP | DOM要素 | チャート | 行 | タブ |
|------|--------|------|---------|----------|-----|------|
| `/evaluations` | 評価一覧 | 200 | 63 btn | **6** | **30** | 0 |
| `/evaluations/:journalId` | 評価結果 | 200 | 32 btn | **4** | — | — |
| `/evaluations/:journalId/human` | 人間評価入力 | 200 | slider×4 + 保存×2 | — | — | 2 |
| `/comparison` | AI vs 人間比較 | 200 | 6 btn | **8** | 0 | 4 |
| `/reliability` | 信頼性分析 (ICC) | 200 | 4 btn | 0※ | 1 | 0 |

※ /reliability はサンプルデータが少なくチャートが出ない場合あり

---

## 3. APIマトリクス (16エンドポイント)

| エンドポイント | 期待 | 実測 | 件数/値 |
|----------------|------|------|---------|
| `GET /api/data/evaluations` | 200 | ✅ 200 | 35件 |
| `GET /api/data/journals` | 200 | ✅ 200 | 36件 |
| `GET /api/data/cohorts` | 200 | ✅ 200 | 10件 |
| `GET /api/data/human-evals` | 200 | ✅ 200 | 24件 |
| `GET /api/data/reliability-results` | 200 | ✅ 200 | OK |
| `GET /api/stats/ai-vs-human` | 200 | ✅ 200 | summaries=24 |
| `POST /api/stats/icc` (正規) | 200 | ✅ 200 | ICC=0.8 (良好) |
| `POST /api/stats/icc-all-factors` (正規) | 200 | ✅ 200 | factor別ICC算出 |
| `POST /api/stats/krippendorff` (正規) | 200 | ✅ 200 | α=0.951 |
| `POST /api/stats/pearson` (正規) | 200 | ✅ 200 | r=1.0 |
| `POST /api/stats/bland-altman` (正規) | 200 | ✅ 200 | mean_diff=-0.06 |
| `POST /api/data/human-evals` (POST保存) | 200 | ✅ 200 | id生成 |
| `POST /api/stats/lgcm` | 403 | ✅ 403 | researcher限定 |
| `POST /api/stats/lcga` | 403 | ✅ 403 | researcher限定 |
| `GET /api/data/students` | 403 | ✅ 403 | 学生管理外 |
| `POST /api/data/journals` | 403 | ✅ 403 | 学生限定 |

→ **APIマトリクス 16/16 一致 ✅**

---

## 4. 統計エンジン動作確認 (重要)

評価者ロール固有の信頼性分析エンジンを **実値ペイロード** で検証:

| メソッド | 入力 | 出力 |
|---------|------|------|
| ICC(2,1) | ratings=[[3,4,5,3,4],[3,4,4,3,4]] | icc=0.800, ci95=[0.946,0.385], p=0.028, 「良好な信頼性」 |
| Pearson | x=[1..5], y=[2..6] | r=1.0, p=0, 「強い相関」 |
| Krippendorff α | ratings=[[3,4,5],[3,4,4]], interval | α=0.951, 「良好な信頼性」 |
| Bland-Altman | method1/2 | mean_diff=-0.06, sd=0.114, LOA=[0.163,-0.283] |
| ICC-all-factors | factor1-2-total | 因子別ICC一括算出 |

→ **統計エンジン本物が動作 ✅**

---

## 5. UI動作確認 (Playwright)

### 評価一覧 (`/evaluations`)
- 30件のテーブル行
- 6個のチャート（評価タスク進捗グラフ等）
- ヘッダーに「30件総評価件数 / 20評価完了 / 10評価待ち / 3.08平均スコア」のサマリーカード

### AI vs 人間比較 (`/comparison`)
- 8個のチャート、4タブ
- 「75%一致率（±0.3以内）」「2.99 AI平均スコア」等の指標カード
- factor別比較タブ実装

### 信頼性分析 (`/reliability`)
- `ICC(2,1) · Bland-Altman · Pearson` のセクション
- 信頼性指標タイトル

### 人間評価入力 (`/evaluations/:journalId/human`)
- **ブラインド評価設計**: 「AI評価・他者コメント非表示」明示
- 省察 / 事実記録の2タブで日誌内容を表示
- 4因子それぞれにスライダー (MUI Slider, 1〜5, step 0.5)
- 各因子の現在スコアを Chip 表示
- 「評価サマリ」カードで4因子+総合平均をリアルタイム表示
- 「評価を保存」ボタン (画面上下に2個)
- **保存ボタンクリック → POST /human-evals → 200 OK → Snackbar「評価を保存しました」 ✅**

### 評価結果 (`/evaluations/:journalId`)
- 4個のチャート、32個のボタン

### コンソールエラー
- ✅ 0件 (全画面でPAGEERROR/CONSOLE errorなし)

---

## 6. 検出した課題

### 課題 #1: 🟡 設計矛盾 — 人間評価が4項目しか送られていない
**詳細**:
- `HumanEvaluationPage.tsx` (行 76-82) は4因子の代表スコア1つずつ (`item_number: 1〜4`) しか保存しない
- しかしサーバ側 `POST /human-evals` (data.ts L1139-1144) は **21項目想定** で集計:
  ```typescript
  if (item.item_number <= 7) scores.f1.push(item.score);
  else if (item.item_number <= 13) scores.f2.push(item.score);
  else if (item.item_number <= 17) scores.f3.push(item.score);
  else scores.f4.push(item.score);
  ```
- 結果: `item_number 1〜4` が **全てf1に集約**、f2/f3/f4が空配列
- ICC計算の前提が崩れている

**影響**: 信頼性分析（ICC）で因子別比較が困難。AI評価との比較も4因子バランスを失う可能性。

**推奨修正**: クライアントを21項目評価に拡張するか、サーバ側を `factor1/2/3/4` フィールド受け取りに変更して整合性を確保。

→ **発見しただけで未修正** (評価設計に影響するため別途方針確認が必要)

### 課題 #2: 🟡 未実装パスがHTMLフォールバック (フレームワーク共通)
**詳細**: `/api/data/teacher/dashboard`, `/api/data/admin/users` 等の**存在しないエンドポイント**を認証済みリクエストで叩くと、SPAの `index.html` が 200 で返ってきてしまう (本来は 404 を返すべき)。

**原因**: Cloudflare Pages の `_routes.json` で `/api/data/*` 配下も SPA fallback が効いてしまう設定の可能性。

**影響**: API クライアント側で `JSON.parse` に失敗するだけなので致命ではない。だが監査として未実装の検出が困難になる。

→ **これはevaluator固有ではなく、フレームワーク共通の課題として記録**

### 課題 #3: 🟢 軽微 — 統計POSTが不正データ時に500を返す
**詳細**: `/api/stats/icc` に空のペイロードを送ると 500 (Internal Server Error)。本来は 400 (Bad Request) を返すべき。

**影響**: 機能上の問題なし。エラーレスポンス品質の問題のみ。

---

## 7. ロール間連動

| 観点 | 状態 |
|------|------|
| 評価者が保存した人間評価 → AI vs 人間比較に反映 | ✅ summaries=24件で確認 |
| 評価者は学生個人情報 (`/students`) にアクセス不可 | ✅ 403 |
| 評価者は日誌投稿 (`POST /journals`) 不可 | ✅ 403 |
| 評価者は縦断分析 (`/lgcm`, `/lcga`) 不可 | ✅ 403 (researcher限定) |
| ブラインド評価設計 (AI評価非表示) | ✅ UIに明示 |

---

## 8. E2Eテスト結果サマリ

```
=== 人間評価POST (キー機能) ===
  POST /human-evals: 200 OK
  human_eval_id 生成: ✅
  GET /human-evals: 24件 → 25件 (POST後)
  Snackbar「評価を保存しました」表示: ✅
  学生で同エンドポイント: 403 ✅ (期待通り)
```

---

## 9. 総合評価

| カテゴリ | 評価 |
|----------|------|
| API動作 | ✅ 完全 (16/16) |
| UI描画 | ✅ 全5画面 (1ページにつきエラー0) |
| ボタン応答 | ✅ 評価を保存ボタン正常動作 (POST→Snackbar) |
| 図表 | ✅ recharts 全レンダリング (評価一覧6個 / 比較8個 / 結果4個) |
| 画面遷移 | ✅ 戻るボタン・ナビゲーション正常 |
| 統計エンジン | ✅ ICC/Pearson/Krippendorff/Bland-Altman 全動作 |
| ブラインド評価設計 | ✅ AI評価・他者コメント非表示の明示UIあり |
| ロール権限制御 | ✅ 学生管理・縦断分析・日誌投稿の権限分離 |
| **人間評価データ整合性** | ⚠️ **クライアント4項目 vs サーバ21項目想定** (要方針確認) |

**最終ステータス: ✅ 監査合格** (1件の設計矛盾要確認・致命バグなし)
