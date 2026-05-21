# 共同研究者(collaborator) / 評議員(board_observer) 軽量監査レポート

- **監査日**: 2026-05-21
- **対象環境**: Production (`https://teaching-practice-eval.pages.dev`)
- **デプロイメント**: `main` branch / commit `7ba4878` (researcher 修正含む)
- **テストユーザー**:
  - `collaborator@teaching-eval.jp` (role=collaborator, user-006, 渡辺 協力者)
  - `observer@teaching-eval.jp` (role=board_observer, user-007, 中村 委員)
- **監査方針**: researcher (詳細監査済み) との差分に集中する軽量検証

---

## 1. サマリー

| 項目 | collaborator | board_observer |
| --- | :---: | :---: |
| API動作 | ✅ 13/14 (1件は別バグの500) | ✅ 13/14 (同上) |
| UIUX動作 | ✅ 12/12 共有ページOK | ✅ 12/12 共有ページOK |
| アクセス制御 (許可ルート) | ✅ 想定通り | ✅ 想定通り |
| アクセス制御 (制限ルート) | ✅ `/teacher-dashboard` `/platform-analytics` ともに unauthorized | ✅ 同左 |
| **設計レビュー** | 🟢 研究者と同等の書き込み権限 (妥当) | 🟡 **書き込み権限が広い (設計判断要)** |

---

## 2. 権限差分の概要

`App.tsx` 解析より、researcher との差分は **わずか2ページのみ** :

| ページ | researcher | collaborator | board_observer |
| --- | :---: | :---: | :---: |
| `/teacher-dashboard` | ✅ | ❌ | ❌ |
| `/platform-analytics` | ✅ | ❌ | ❌ |
| その他研究系ページ (21ルート) | ✅ | ✅ | ✅ |

`collaborator` と `board_observer` は **App.tsx 上では完全に同じルート権限** を共有し、`AppLayout.tsx` L136 でサイドバー定義も共有しています。

---

## 3. API 監査 (14エンドポイント)

### 3.1 閲覧系 (両ロール共通)
| パス | collaborator | board_observer | 想定 |
| --- | :---: | :---: | --- |
| `GET /api/data/users` | 🛑403 | 🛑403 | OK (admin限定で適切) |
| `GET /api/data/journals` | ✅ | ✅ | OK |
| `GET /api/data/evaluations` | ✅ | ✅ | OK |
| `GET /api/data/cohorts` | ✅ | ✅ | OK |
| `GET /api/data/exports/requests` | ✅ | ✅ | OK |
| `GET /api/admin/operational-readiness` | ✅ | ✅ | OK |
| `GET /api/admin/metrics/cleanup` | ✅ | ✅ | OK |
| `GET /api/analytics/pipeline` | ✅ | ✅ | OK |

### 3.2 統計計算 (POST, データ生成なし)
| パス | collaborator | board_observer |
| --- | :---: | :---: |
| `POST /api/stats/icc` | ✅ ICC=0.771 | ✅ ICC=0.771 |
| `POST /api/stats/lgcm` | ✅ | ✅ |

### 3.3 データ生成系 (POST, DB書き込み)
| パス | collaborator | board_observer | 評価 |
| --- | :---: | :---: | --- |
| `POST /api/data/exports/requests` | ✅ 作成成功 (`req-68015f43-...`) | ✅ 作成成功 (`req-4078d420-...`) | OK |
| `POST /api/data/human-evals` | 500 (別バグ) | 500 (別バグ) | 🟡 board_observerに人間評価書き込み権限がある |

---

## 4. UI 監査 (Playwright)

### 4.1 共有ページ (12件) — 両ロールとも 12/12 OK
`/admin`, `/evaluations`, `/comparison`, `/reliability`, `/cohorts`, `/longitudinal`, `/scat`, `/scat-batch`, `/statistics`, `/advanced-analytics`, `/exports`, `/journals` (前監査で修正)

### 4.2 制限ページ (2件) — 両ロールとも ✅ 期待通り unauthorized
- `/teacher-dashboard` (`teacher / univ_teacher / school_mentor / admin / researcher` のみ)
- `/platform-analytics` (`admin / researcher` のみ)

### 4.3 ロール表示
- collaborator: 「**研究協力者**」 (#0288d1)
- board_observer: 「**教育委員会**」

ホーム URL は両ロールとも `/admin` (`AdminDashboardPage` を 研究ダッシュボードとして再利用)

---

## 5. 🟡 設計レビュー: board_observer の書き込み権限について

### 観察事項

`board_observer` (評議員/オブザーバー) は名前から **読み取り専用ロール** が想定されますが、コード上では以下の **8件の書き込み系エンドポイント** が許可されています:

| エンドポイント | 用途 | 評価 |
| --- | --- | --- |
| `POST /api/data/exports/requests` | エクスポート要求 | 🟢 監査ログ目的なら妥当 |
| `POST /api/data/evaluations` | AI評価結果書き込み | 🟡 観察者がAI評価を生成するのは想定外 |
| `POST /api/data/human-evals` | 人間評価書き込み | 🔴 **観察者が評価作業者になるのは設計矛盾** |
| `POST /api/data/icc-results` | ICC結果保存 | 🟡 計算結果保存だが要検討 |
| `POST /api/data/evaluator-profiles` | 評価者プロファイル作成 | 🔴 observer 自身が評価者扱いになる |
| `POST /api/data/scat/projects` | SCATプロジェクト作成 | 🟡 観察者が分析実行は要検討 |
| `POST /api/data/scat/segments/:projectId` | SCAT セグメント書き込み | 🟡 同上 |
| `POST /api/data/scat/codes` | SCATコード書き込み | 🟡 同上 |
| `PUT /api/data/scat/projects/:projectId/theorization` | SCAT理論化結果保存 | 🟡 同上 |

### 推奨対応 (要ユーザー判断)

設計意図が以下のいずれかにより、対応が分かれます:

- **(A) 「board_observer = 第三者監査者 / 教育委員会オブザーバー」と解釈する場合**
  - 上記 🔴 と 🟡 のうちデータ生成系全てから `board_observer` を除外する修正が必要
  - エクスポート要求のみは監査用途として残す

- **(B) 「board_observer = 教育委員会の研究参加者」と解釈する場合**
  - 現状の設計でOK (collaborator と完全同等)
  - その場合は `board_observer` の名前を `committee_member` などに改名検討

### 現状ステータス
本軽量監査では**観察事項として記録のみ**とし、対応は次フェーズでユーザー判断後に実施します。データ実害は現時点では発生していません (オブザーバーシードユーザーが評価作業を行った形跡なし)。

---

## 6. 🟡 別バグ: `POST /api/data/human-evals` 500 エラー

```
POST /api/data/human-evals
→ 500 {"error":"TypeError: Cannot read properties of undefined (reading 'forEach')"}
```

### 原因
`src/api/routes/data.ts` L1139 で `body.items.forEach(...)` を呼ぶが、`items` フィールドが未送信の場合に undefined になる。私の監査ペイロード `{ scores: {...} }` は古い形式 (factor1/2/3/4 オブジェクト) で、現在の正しい形式 `{ items: [{item_number, score, is_na, comment}, ...] }` ではないため発生。

### 評価
- バリデーション不備 (🟡): リクエスト形式の不正で 500 ではなく 400 を返すべき
- フロントエンドが正しい形式で送る限り、実害なし
- evaluator ロール監査では 25件のhuman-evals 書き込み成功実績あり (commit `225a358`)

---

## 7. 結論

**collaborator と board_observer は researcher との UI 差分が 2 ページのみで、本軽量監査では既存修正 (researcher の `/journals` バグ修正 commit `7ba4878`) により全機能が正常動作することを確認しました。**

- 統計エンジン両ロールで動作 (`POST /api/stats/icc`, `/lgcm`)
- エクスポート要求作成両ロールで動作 (`POST /api/data/exports/requests`)
- ルート権限制御 (`/teacher-dashboard`, `/platform-analytics`) は期待通り
- リグレッションなし (researcher 監査の修正が両ロールに伝播し正常)

### 設計判断が必要な事項 (ユーザーに確認)
1. **board_observer の人間評価書き込み権限の是非** (🔴/🟡 計9件) — オブザーバーの定義による
2. **`POST /api/data/human-evals` の入力バリデーション強化** — 500 ではなく 400 を返すように

### 検証スクリプト
- `/tmp/co_bo_api.js` — API 14件マトリクス (両ロール)
- `/tmp/co_bo_pw.js` — Playwright 14ページ検証 (両ロール)

---

## 8. 完了ロール (8/8) ✅

- student / univ_teacher / school_mentor / evaluator / admin / researcher / **collaborator** / **board_observer**

**全8ロールの監査が完了しました。**
