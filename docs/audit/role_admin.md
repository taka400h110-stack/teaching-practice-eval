# 管理者(admin)ロール 監査レポート

- **監査日**: 2026-05-21
- **対象環境**: Production (`https://teaching-practice-eval.pages.dev`)
- **デプロイメント**: `main` branch / commit に含めた変更を反映済み
- **テストユーザー**: `admin@teaching-eval.jp` (role=admin, user-004)

---

## 1. サマリー

| 項目 | 結果 |
| --- | --- |
| API動作 | ✅ 全エンドポイントJSON正常応答 (18件中18件) |
| UIUX動作 | ✅ サイドバー5項目、各ページ正常表示 |
| 図表描画 | ✅ /evaluations で6チャート, /admin で複数指標 |
| ボタン応答 | ✅ ユーザー登録/エクスポート承認/メトリクス取得 全て動作 |
| ページ遷移 | ✅ 18ページ全て遷移成功 |
| **セキュリティ** | 🔴 **重大バグ発見 → 修正済み** |

---

## 2. アクセス可能なルート (~25)

App.tsx の `PrivateRoute` ロール許可リストから抽出した admin が到達可能なルート:

### サイドバー (AppLayout.tsx L175-189)
1. `/admin` — 管理ダッシュボード
2. `/admin/analytics` — プラットフォーム分析
3. `/admin/users` — ユーザー登録
4. `/admin/exports` — エクスポート承認管理
5. `/admin/data-export` — データエクスポート

### その他閲覧可能なルート
- `/students`, `/students/:id`
- `/journals`, `/journals/:id`
- `/evaluations`, `/evaluations/:journalId`
- `/research/dashboard`
- `/research/journals/:id/scat|ism|sp-table|transmission`
- `/research/analyses/*`
- `/profile`, `/notifications`, `/settings`

---

## 3. API 監査 (18エンドポイント)

### 3.1 フロントエンドが実際に使用するパス (全てJSON応答)
| パス | Status | 応答キー |
| --- | --- | --- |
| `/api/admin/metrics/cleanup?range=7d` | 200 | range, generatedAt, summary, dailySeries, recentRuns |
| `/api/admin/alerts/cleanup-failure` | 200 | hasAlert, severity, rangeHours, errorCount, lastErrorAt |
| `/api/admin/alerts/history` | 200 | items, pageInfo, filtersApplied, summary |
| `/api/admin/incidents/cleanup?fingerprint=*` | 200 | incidents |
| `/api/admin/analytics/delivery?range=7d` | 200 | range, summary, providerBreakdown, dailySeries |
| `/api/admin/operational-readiness` | 200 | generatedAt, environment, secrets, cron, providers |
| `/api/data/users` (POST: ユーザー登録) | 200 | success, user{id,email,name,role} |
| `/api/data/exports/requests` (GET) | 200 | requests[] |
| `/api/data/journals` | 200 | success, journals[] (36件; submitted:24, draft:2, evaluated:10) |
| `/api/data/evaluations` | 200 | success, evaluations[] (35件) |

### 3.2 統計エンジン (admin はevaluatorと同じく使える想定)
- ICC (2,1) / Pearson / Krippendorff α / Bland-Altman: ✅ evaluator監査で動作確認済み

---

## 4. UI 監査 (Playwright, 18ページ + SCAT 4ページ)

### 4.1 主要ページ
| ページ | buttons | charts | tableRows | tabs | inputs | 状態 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| /admin | 2+ | 複数 | - | - | - | ✅ |
| /admin/analytics | 2+ | 複数 | - | - | - | ✅ |
| /admin/users | あり | 0 | - | - | あり (フォーム) | ✅ |
| /admin/exports | あり | 0 | あり | - | - | ✅ |
| /admin/data-export | あり | 0 | - | - | あり | ✅ |
| /journals | あり | あり | あり | - | - | ✅ |
| /students | あり | あり | あり | - | - | ✅ |
| **/evaluations** | **63+** | **6** | **34** | - | - | ✅ |
| /evaluations/:id | あり | あり | - | あり | - | ✅ |
| /research/dashboard | あり | あり | - | - | - | ✅ |
| /research/analyses/* | あり | あり | あり | - | - | ✅ |

### 4.2 SCAT 研究系ルート (代表ジャーナル `2a47f8a9-...` で検証)
| ルート | 結果 | 備考 |
| --- | --- | --- |
| `/research/journals/:id/scat` | ✅ 表示 | テーブル5行、ストーリーライン本文表示 |
| `/research/journals/:id/ism` | 🟡 「データがありません」 | 該当日誌に ISM 解析データなし。挙動として正常 |
| `/research/journals/:id/sp-table` | 🟡 「データがありません」 | 同上 (SP表分析データ未生成) |
| `/research/journals/:id/transmission` | 🟡 「データがありません」 | 同上 (伝達係数データ未生成) |

→ SCAT のみ実データあり、他3つは分析未実行 (バグではない)

### 4.3 /evaluations 0行問題 (前回の懸念) → 解決
- 前回のPhase 3 Playwrightが `rows:0` を返した
- API再確認: `/journals` 36件 (non-draft 34件)、`/evaluations` 35件 ともに正常
- Playwright を networkidle + 5秒待機 で再テスト → **34行・6チャート・41チップ 正常表示**
- **結論**: タイミング問題 (waitForTimeout 2.5秒では React Query 完了前にスナップショット取得)。バグではない。

---

## 5. 発見した問題 (Issues)

### 🔴 Issue 1: ADMIN系APIロールチェック欠落 (重大セキュリティ) — **修正済み**

#### 5.1.1 影響範囲
- `GET /api/admin/operational-readiness`
- `GET /api/admin/incidents/cleanup`
- `POST /api/admin/incidents/cleanup/trigger`
- `POST /api/admin/incidents/cleanup/resolve`

#### 5.1.2 問題内容
これらのエンドポイントは `requireAuth` のみで `requireRoles` チェックが存在せず、認証済みであれば **student / evaluator / school_mentor 等すべての権限**で運用情報やインシデント情報の閲覧・操作が可能だった。

#### 5.1.3 修正内容
**`src/api/routes/adminIncidents.ts`** — ルーター全体に2層ミドルウェアを追加:
```typescript
import { requireAuth, requireRoles } from '../middleware/auth';
adminIncidentsRouter.use('*', requireAuth);
adminIncidentsRouter.use('*', requireRoles(['admin','researcher','collaborator','board_observer'] as any));
```

**`src/api/routes/adminOperationalReadiness.ts`** — ハンドラ先頭にインラインガードを追加:
```typescript
const user = c.get('user') as { role?: string; roles?: string[] } | undefined;
const allowedRoles = ['admin','researcher','collaborator','board_observer'];
const userRoles = user?.roles?.length ? user.roles : (user?.role ? [user.role] : []);
const hasAccess = userRoles.some((r) => allowedRoles.includes(r));
if (!user || !hasAccess) return c.json({ error: 'アクセス権限がありません' }, 403);
```

#### 5.1.4 検証結果 (`/tmp/admin_security_recheck.js`)
| ロール | /operational-readiness | /incidents/cleanup |
| --- | --- | --- |
| student | 403 ✅ | 403 ✅ |
| evaluator | 403 ✅ | 403 ✅ |
| admin | 200 ✅ | 200 ✅ |
| researcher | 200 ✅ | 200 ✅ |

→ **修正済み、本番デプロイ済み (`4d3a1f7f.teaching-practice-eval.pages.dev`)**

---

### 🟡 Issue 2: ベースGET(/) 未定義パスが SPA fallback で HTML を返す

#### 5.2.1 内容
`/api/admin/alerts`, `/api/admin/metrics`, `/api/admin/incidents` などのベースパス GET (リスト想定) はサブルーターでハンドラが定義されておらず、認証済みクライアントが叩くと Cloudflare Pages の SPA fallback により **`200 + text/html` (index.html)** が返却される。

#### 5.2.2 影響
- フロントエンドは実際にはベースパスを叩かないため**実害なし**
- ただし API パスが HTML を返す挙動は API設計として混乱を招く。404 を返すべき。

#### 5.2.3 推奨対応 (デファード)
- `/api/*` のキャッチオール 404 ハンドラを追加するか、各サブルーターに `GET /` のスタブを定義する
- 優先度低: 機能影響なし、設計上のクリーンアップ

---

### 🟡 Issue 3: SCAT/ISM/SP表/伝達係数 のデータ未生成

#### 5.3.1 内容
代表的なジャーナル `2a47f8a9-...` で SCAT のみ実データがあり、ISM / SP-Table / 伝達係数の3つはいずれも「データがありません」表示。

#### 5.3.2 評価
- 機能としては正常 (データが無いことを明示表示)
- バックエンド側の分析パイプライン (バッチ or オンデマンド生成) のフロントUI/UXは別ロール (researcher) で監査予定

---

## 6. 結論

- **機能面**: ✅ admin 全機能が想定通り動作 (18 API、22 ページ、主要アクション)
- **セキュリティ**: 🔴 重大な認可漏れを発見→修正→本番反映済み
- **UIUX**: ✅ サイドバー5項目すべて遷移可能、図表・テーブル・フォームすべて正常
- **次のアクション**: researcher ロールの監査へ進む

---

## 7. 検証で使用したテストスクリプト

| パス | 用途 |
| --- | --- |
| `/tmp/admin_api_audit.js` | 18エンドポイントマトリクス |
| `/tmp/admin_api_v2.js` | 適切クエリパラメータ + 権限チェック |
| `/tmp/admin_security_recheck.js` | セキュリティ修正検証 |
| `/tmp/admin_pw3.js` | Playwright 18ページ走査 (リトライ機能付き) |
| `/tmp/admin_eval_pw.js` | /evaluations 詳細検証 (5秒待機 + networkidle) |
| `/tmp/admin_scat_pw.js` | SCAT 4ルート検証 |
| `/tmp/admin_actions.js` | アクションエンドポイントテスト |
| `/tmp/admin_real_paths.js` | フロントエンド実使用パスのJSON応答確認 |

