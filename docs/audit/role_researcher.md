# 研究者(researcher)ロール 監査レポート

- **監査日**: 2026-05-21
- **対象環境**: Production (`https://teaching-practice-eval.pages.dev`)
- **デプロイメント**: `main` branch / 本監査の修正を反映済み (deploy `a2908f49`)
- **テストユーザー**: `researcher@teaching-eval.jp` (role=researcher, user-005, 伊藤 研究者)

---

## 1. サマリー

| 項目 | 結果 |
| --- | --- |
| API動作 | ✅ 全実在エンドポイントJSON正常応答 (15+件) |
| UIUX動作 | ✅ サイドバー 4グループ13項目、各ページ正常表示 |
| 図表描画 | ✅ /admin, /evaluations, /longitudinal, /statistics 等で多数 |
| ボタン応答 | ✅ エクスポート要求作成成功 (req-17a881d2-...) |
| ページ遷移 | ✅ 22ページ全て遷移成功 |
| **アクセス制御** | 🔴 **重大バグ発見 → 修正済み** (`/journals` 一覧) |

---

## 2. アクセス可能なルート (~24)

`App.tsx` の `PrivateRoute` ロール許可リストから抽出した researcher が到達可能なルート:

### サイドバー (AppLayout.tsx L136-173) — 4グループ 13項目
- **研究ダッシュボード**: `/admin`
- **AI評価信頼性**: `/evaluations`, `/comparison`, `/reliability`
- **縦断成長分析**: `/cohorts`, `/longitudinal`, `/scat`, `/scat-batch`, `/scat-network`, `/scat-timeline`, `/statistics`, `/advanced-analytics`
- **データ管理・出力**: `/exports`

### その他到達可能なルート (サイドバー外)
- `/platform-analytics` (admin/researcher 限定)
- `/students`, `/students/:id`
- `/journals`, `/journals/:journalId` (**本監査で修正**)
- `/teacher-dashboard`, `/teacher-statistics`
- `/international`
- `/research/journals/:journalId/scat|ism|sp-table|transmission`

---

## 3. API 監査

### 3.1 データ取得系 (全てJSON応答)
| パス | Status | 応答 |
| --- | --- | --- |
| `/api/data/users` | 200 | users[] |
| `/api/data/journals` | 200 | journals[] (36件) |
| `/api/data/evaluations` | 200 | evaluations[] (35件) |
| `/api/data/cohorts` | 200 | cohorts[] |
| `/api/data/exports/requests` | 200 | requests[] |

### 3.2 統計エンジン (POST分析)
| エンドポイント | Status | 検証内容 |
| --- | --- | --- |
| `/api/stats/icc` | 200 | ICC=0.771, CI95=[0.929,0.571], p=0.021 「良好な信頼性」 |
| `/api/stats/pearson` | 200 | r=1.0, n=4「強い相関」 |
| `/api/stats/krippendorff` | 200 | α=1.0「良好な信頼性」 |
| `/api/stats/bland-altman` | 200 | mean_diff=-0.1, loa計算正常 |
| `/api/stats/lcga` | 200 | best_class=1, AIC=-54.82, BIC=-72.85 (外部Statsプロバイダ動作) |
| `/api/stats/lgcm` | 200 | intercept_mean=1.333, slope_mean=1, CFI/TLI/RMSEA計算正常 |
| `/api/stats/missing-data-process` | 200 | 平均値補完OK |
| `/api/analytics/g-methods` | 200 | run_id生成, IPTW法実行 |
| `/api/analytics/pipeline` | 200 | layers完備 (L1-L6) |
| `/api/analytics/fairness` | 200 | run_id, status="no_data"（実データ未投入時の正常応答） |
| `/api/stats/ai-vs-human` | 200 | summaries[] |

### 3.3 管理系 (admin との共通権限)
全6エンドポイント 200 JSON 応答 (admin 監査と同じ結果):
- `/api/admin/metrics/cleanup`, `/api/admin/alerts/cleanup-failure`, `/api/admin/alerts/history`
- `/api/admin/incidents/cleanup`, `/api/admin/analytics/delivery`, `/api/admin/operational-readiness`

### 3.4 researcher 固有: エクスポート要求作成
| 操作 | 結果 |
| --- | --- |
| `POST /api/data/exports/requests` | ✅ 200 `{id: "req-17a881d2-d8a1-48c9-b928-cbf1f1574dd7", status: "pending"}` |
| `requested_anonymization_level` 必須 (`pseudonymized` 指定) | OK |
| 監査ログ (`setAuditWriteContext`) | 動作 |

---

## 4. UIUX (Playwright) 監査結果 — 22ページ

| パス | 評価 | 主な構成要素 |
| --- | --- | --- |
| `/admin` | ✅ | buttons:16, charts:20, rows:4, tabs:4 (研究ダッシュボード入口) |
| `/evaluations` | ✅ | buttons:138, charts:6, rows:34 (前 admin 監査と同等) |
| `/comparison` | ✅ | charts:8, tabs:4 (AI vs 人間比較) |
| `/reliability` | ✅ | rows:1 (ICC分析サマリ) |
| `/cohorts` | ✅ | rows:12, tabs:4, inputs:3 |
| `/longitudinal` | ✅ | charts:6, tabs:6 (LGCM時系列) |
| `/scat` | ✅ | tabs:5, inputs:4 (SCAT 4ステップタブ) |
| `/scat-batch` | ✅ | rows:36, inputs:37 (バッチ処理UI) |
| `/scat-network` | ✅ | inputs:1 (ネットワーク図UI) |
| `/scat-timeline` | ✅ | charts:7 (時系列分析) |
| `/statistics` | ✅ | charts:4, tabs:4 |
| `/advanced-analytics` | ✅ | tabs:3 |
| `/platform-analytics` | ✅ | tabs:3 |
| `/exports` | ✅ | rows:4 (要求一覧) |
| `/students` | ✅ | buttons:16, rows:4 |
| **`/journals`** | 🔴→✅ | **修正前: ⚠️権限なし → 修正後: Card 36件正常表示** |
| `/teacher-statistics` | ✅ | charts:4, tabs:4 |
| `/international` | ✅ | (placeholder UI) |
| `/teacher-dashboard` | ✅ | rows:12, tabs:2 |
| `/profile`, `/notifications`, `/settings` | 🟡 | ルート未定義 → `/admin` (ホーム) にフォールバック表示 |

---

## 5. 発見・修正したバグ

### 🔴 Bug 1: `/journals` 一覧が researcher / admin / collaborator / board_observer にアクセス不可

#### 影響
- 研究系ロールが日誌一覧から個別ジャーナルを開けない
- `/research/journals/:id/scat` などの SCAT/ISM/SP表/伝達係数 ページへの入口が UI 上で断絶
- 監査前は `/journals` で `⚠️ /unauthorized` 表示

#### 原因 (`src/App.tsx` L128-130)
```tsx
<Route path="journals"              element={<PrivateRoute allowedRoles={["student", "teacher", "univ_teacher", "school_mentor"]}>...
<Route path="journals/:journalId"   element={<PrivateRoute allowedRoles={["student", "teacher", "univ_teacher", "school_mentor"]}>...
```

研究系ロール (`researcher`, `admin`, `collaborator`, `board_observer`) が許可リストから漏れていた。

#### 修正
4ロールを許可リストに追加:
```tsx
<Route path="journals"              element={<PrivateRoute allowedRoles={["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]}>...
<Route path="journals/:journalId"   element={<PrivateRoute allowedRoles={["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]}>...
```

#### 検証
| ロール | 修正前 | 修正後 |
| --- | --- | --- |
| student | Card 17件 (自分のみ) | Card 17件 (リグレッションなし) |
| admin | ⚠️ unauthorized | Card 36件 ✅ |
| researcher | ⚠️ unauthorized | Card 36件 ✅ |
| evaluator | ⚠️ unauthorized | ⚠️ unauthorized (設計通り、変更なし) |

---

## 6. 未実装・観察事項 (🟡 ノンブロッキング)

1. **`/profile`, `/notifications`, `/settings` のルート未定義** — SPA フォールバックで `/admin` (ホーム) を表示。**admin監査でも同じ挙動**で、全ロール共通の未実装機能。次フェーズで実装検討。

2. **`/api/stats/overview`, `/api/stats/longitudinal`, `/api/analytics/reliability`, `/api/analytics/comparison`, `/api/data/scat-analyses`, `/api/data/ism-analyses`, `/api/data/exports/datasets` がSPAフォールバック** — 実在しないベースパス。フロントエンドはそれぞれ実在パス (`/api/stats/icc`, `/api/stats/lcga` 等) を使うため実害なし。

3. **`/scat-network` のチャート描画が `c:0`** — 当該UIは Cytoscape.js などのキャンバスベースを使う可能性、Playwright の SVG/Canvas セレクタでは検出されない。視覚的検証は別途必要。

---

## 7. 結論

**researcher ロールは本監査で発見した `/journals` アクセス権バグ修正後、全機能が正常動作することを確認しました。**

- 統計エンジン (ICC, Pearson, Krippendorff, Bland-Altman, LCGA, LGCM) は全て本番環境で動作
- エクスポート要求作成 (`POST /api/data/exports/requests`) は監査ログ込みで動作
- データ閲覧範囲は admin と同等 (`requireRoles(['admin','researcher','collaborator','board_observer'])`)
- collaborator / board_observer は同じサイドバー定義 (L136) を共有するため、本修正で同時に救済される

検証スクリプト:
- `/tmp/researcher_api.js` — API初期マトリクス (19件)
- `/tmp/researcher_api_v2.js` — 実在パス検証
- `/tmp/researcher_api_v3.js` — 正しいペイロードで再検証
- `/tmp/researcher_pw.js` — 22ページPlaywright監査
- `/tmp/researcher_pw2.js` — `/journals` 修正後の検証
- `/tmp/researcher_journals_verify.js` — Card数36件確認
- `/tmp/journals_regression.js` — 他ロールへのリグレッション確認
