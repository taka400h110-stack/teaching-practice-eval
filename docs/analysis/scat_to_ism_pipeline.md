# SCAT → ISM → SP表 / 伝達係数 連動パイプライン仕様

**Status**: Specification — 連動ロジック未実装 (現状は SCAT ネットワーク API のみ存在)
**Last Updated**: 2026-05-21
**Authoritative**: ユーザ指示 (2026-05-21)
> 「ISM・SP表・伝達係数は SCAT のネットワーク構造が更新されるたびに更新する」

---

## 1. 全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                      SCAT 分析 (one source of truth)              │
│                                                                   │
│   scat_projects ──┐                                              │
│                   ├── scat_segments  ──── (テキスト断片)         │
│   scat_codes  ────┘                                              │
│         │                                                         │
│         └── step4_theme = ノード候補                              │
│                                                                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ ネットワーク構造算出 (既存実装あり)
                   │ GET /api/data/scat/network
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  SCAT ネットワーク   { nodes: [...], edges: [...] }              │
│                                                                   │
│  - nodes: テーマ (step4_theme をパース)                          │
│  - edges: 同一グループ内共起テーマペア + 重み                    │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   │ ★トリガー: SCAT 構造が更新されたら以下を再計算
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   ┌─────────┐ ┌──────┐ ┌────────────┐
   │ ISM      │ │ SP表 │ │ 伝達係数   │
   │ 隣接行列 │ │ S×P  │ │ T          │
   │ 可到達   │ │ 0/1  │ │ ゲージ     │
   │ 階層図   │ │      │ │            │
   └─────────┘ └──────┘ └────────────┘
```

---

## 2. 連動の原則

### 2.1 単一情報源 (Single Source of Truth)

**SCAT の `step4_theme` を編集することが、ISM/SP/伝達係数のすべての出発点** である。

- ✋ ユーザが直接 ISM の隣接行列を編集することは **原則禁止** (将来オーバーライド機能を許可する場合は別仕様)
- ✋ SP 表の列 (問題) も ISM のノードから自動生成。手動追加は不可

### 2.2 更新トリガー

以下のすべての操作が "SCAT ネットワーク更新イベント" となり、ISM・SP表・伝達係数の再計算をスケジュールする:

| トリガー | API | 影響範囲 |
|---|---|---|
| 1 | `POST /api/data/scat/projects` | プロジェクト作成 (空なので即影響なし) |
| 2 | `POST /api/data/scat/segments/:projectId` | セグメント追加 → 後段でコード入力されると影響 |
| 3 | `POST /api/data/scat/codes` | **コード更新 (最重要トリガー)**。`step4_theme` 変更で構造変化 |
| 4 | `PUT /api/data/scat/projects/:id/theorization` | 理論化更新 (テーマ集約に影響する場合あり) |
| 5 | `POST /api/openai/scat-analysis` 系 | AI による自動 SCAT 生成 (3 と同等) |
| 6 | `DELETE /api/data/scat/codes/:id` (未実装) | コード削除 (将来) |

`POST /scat/codes` が最も頻繁かつ影響大なので **必ず再計算をキック** する。

### 2.3 整合性ポリシー

- **強整合 (Strong Consistency)**: 再計算が完了するまで関連 API のレスポンスは古い値か `recomputing: true` フラグを返す
- **結果整合 (Eventual Consistency)**: 再計算完了後に各エンドポイントが新しい値を返せばよい
- 本システムは **結果整合** で設計する (Cloudflare Workers の制約上、長時間の同期処理は不可)

---

## 3. 実装パターン

### 3.1 同期計算 (推奨: 軽量)

`step4_theme` 変更時、リクエスト内で直接以下を実行:

```typescript
// src/api/routes/data.ts の POST /scat/codes ハンドラ内 (擬似コード)

await db.prepare("INSERT INTO scat_codes ...").run();

// ① SCAT ネットワーク再計算
await recomputeScatNetwork(db);

// ② ISM 再計算 (= SCAT ネットワークから直接導出可能)
await recomputeIsm(db);

// ③ 伝達係数 (ISM の可到達行列から)
await recomputeTransmission(db);

// ④ SP 表 (ISM のノード × 学生 × 日誌出現)
await recomputeSpTables(db, { scope: "course" });

// ⑤ キャッシュ無効化
await invalidateStatsCache(db, ["stats:scat:network", "stats:ism:*", "stats:sp:*", "stats:transmission:*"]);

return c.json({ success: true, id });
```

**制約**: Cloudflare Workers の CPU 時間制限 (50ms/30ms) を超えないこと。
ノード数 n が 20〜30 程度なら可到達行列 (Warshall) は O(n³) = 27,000 操作で問題なし。
n > 50 になる場合は非同期化を検討。

### 3.2 非同期計算 (重い場合)

`POST /scat/codes` は即時応答し、再計算は別経路で実行:

#### Option A: Cloudflare Queues
```typescript
await env.RECOMPUTE_QUEUE.send({
  type: "scat_updated",
  scat_project_id: ...,
  triggered_by: user.id,
  triggered_at: nowISO(),
});
return c.json({ success: true, recompute_queued: true });
```

#### Option B: ジョブテーブル + 手動ポーリング
```typescript
await db.prepare(`
  INSERT INTO recompute_jobs (id, type, scope_json, status, created_at)
  VALUES (?, 'scat_to_ism', ?, 'pending', CURRENT_TIMESTAMP)
`).bind(genId(), JSON.stringify({ scope: "all" })).run();
```

外部 Cron Worker が `pending` ジョブを処理。

#### Option C: 遅延書き込みフラグ
`scat_codes` 更新時に `analysis_dirty` フラグを立てるだけ:
```sql
UPDATE analysis_state SET ism_dirty=1, sp_dirty=1, transmission_dirty=1
WHERE scope = ?;
```
GET 系エンドポイント (`/ism/analyses/:id` 等) が呼ばれた時に `dirty=1` なら再計算してから返す。

### 3.3 採用案 (推奨)

| n (テーマ数) | 採用 |
|---|---|
| 〜 30 | **3.1 同期計算** (POST /scat/codes のレスポンスを 1-2 秒以内に保てる範囲) |
| 30 〜 200 | **3.3 遅延書き込みフラグ** (POST は即時、GET 時に必要に応じて再計算) |
| 200+ | **3.2 Cloudflare Queues** |

現状の対象規模 (1 コホート 20-30 名 × 数十テーマ) では **3.1 + 3.3 のハイブリッド** が現実的。

---

## 4. データモデル拡張

### 4.1 `analysis_state` テーブル (新規)

```sql
CREATE TABLE IF NOT EXISTS analysis_state (
  scope TEXT PRIMARY KEY,         -- "global" or "course:<id>" or "cohort:<id>"
  scat_network_hash TEXT,         -- 最新の SCAT ネットワーク構造ハッシュ
  ism_computed_at DATETIME,       -- ISM 最終計算時刻
  ism_dirty INTEGER DEFAULT 0,    -- 再計算必要フラグ
  sp_computed_at DATETIME,
  sp_dirty INTEGER DEFAULT 0,
  transmission_computed_at DATETIME,
  transmission_dirty INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- `scat_network_hash`: ノード集合とエッジ集合を `JSON.stringify` してハッシュ化
- ハッシュが変わったら `*_dirty = 1`
- GET 時に `*_dirty = 1` なら再計算 → 結果格納 → `*_dirty = 0`

### 4.2 `recompute_jobs` テーブル (Option B 用、将来)

```sql
CREATE TABLE IF NOT EXISTS recompute_jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                  -- 'scat_to_ism' / 'ism_to_sp' / 'ism_to_transmission'
  scope_json TEXT,                     -- {"scope": "course", "course_id": "..."}
  status TEXT DEFAULT 'pending',       -- pending / running / completed / failed
  triggered_by TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);
```

---

## 5. API 契約

### 5.1 既存 API の挙動変更

#### `POST /api/data/scat/codes` (今後)
- レスポンスに `recomputed: { ism: true, sp: true, transmission: true }` を含める
- 同期計算が完了している場合は `recomputed_at: ISO8601` も
- 非同期の場合は `recompute_job_ids: [...]`

```jsonc
// 例: 同期完了レスポンス
{
  "success": true,
  "id": "code_xxx",
  "recomputed": {
    "ism": true,
    "sp": true,
    "transmission": true
  },
  "recomputed_at": "2026-05-21T22:30:00Z"
}
```

### 5.2 新規 API

| Method | Path | 用途 |
|---|---|---|
| `GET` | `/api/data/analysis/state` | 各分析の `*_dirty` 状態を取得 |
| `POST` | `/api/data/analysis/recompute` | 手動で全再計算 (管理者) |
| `GET` | `/api/data/ism/analyses/current?scope=...` | 最新の ISM 結果 (dirty なら再計算してから返す) |
| `GET` | `/api/data/sp-tables/current?scope=...` | 最新の SP 表 |
| `GET` | `/api/data/transmission/current?scope=...` | 最新の伝達係数 |

---

## 6. キャッシュ無効化

SCAT 更新時に無効化すべきキャッシュキー:

```
stats:scat:network
stats:scat:timeline:*
stats:ism:*
stats:sp:*
stats:transmission:*
```

実装ヘルパ (擬似):

```typescript
async function invalidateScatDependentCaches(db: D1Database) {
  await db.prepare(`
    DELETE FROM stats_cache 
    WHERE cache_key LIKE 'stats:scat:%' 
       OR cache_key LIKE 'stats:ism:%'
       OR cache_key LIKE 'stats:sp:%'
       OR cache_key LIKE 'stats:transmission:%'
  `).run();
}
```

---

## 7. UI 設計指針

### 7.1 ステータス表示

各分析ページ (`/research/journals/:id/ism`, `/sp-table`, `/transmission`) で:

- `ism_dirty = 1` の場合は **「⚠️ 再計算待ち」** バッジを表示
- 表示中の値の右肩に **「最終計算: 2026-05-21 22:30」** を表示
- 「今すぐ再計算」ボタンで手動トリガーも可能

### 7.2 リアルタイム反映 (将来)

SCAT 編集画面 (`SCATAnalysisPage`) で `step4_theme` を保存した瞬間、サイドパネルに以下を表示:

> ✅ SCAT 更新を受けて以下が再計算されました:
> - ISM: 階層数 5 → 6
> - SP 表: 25 学生 × 14 問題
> - 伝達係数 T: 0.42 → 0.45

---

## 8. テストケース

### 8.1 単体: ハッシュ計算

```typescript
const network1 = { nodes: ["A","B","C"], edges: [["A","B"]] };
const network2 = { nodes: ["A","B","C"], edges: [["A","B"]] };  // 同一
const network3 = { nodes: ["A","B","C"], edges: [["A","B"],["B","C"]] };  // 変化

expect(networkHash(network1)).toBe(networkHash(network2));
expect(networkHash(network1)).not.toBe(networkHash(network3));
```

### 8.2 E2E: 連動更新

```javascript
// tests/e2e/scat_to_ism_propagation.spec.js
// 1. researcher としてログイン
// 2. SCAT プロジェクト作成 → セグメント追加 → step4_theme 設定
// 3. GET /analysis/state → ism_dirty = 0 を確認 (またはハッシュ一致)
// 4. step4_theme を変更
// 5. GET /analysis/state → ism_dirty = 1 を期待 (または再計算済を期待)
// 6. GET /ism/current → 新しいテーマがノードに含まれることを確認
// 7. GET /transmission/current → T 値が変化したことを確認
// 8. GET /sp-tables/current → 問題 (列) が更新されていることを確認
```

---

## 9. 現状実装ギャップ (重要)

| 項目 | 現状 | 必要作業 |
|---|---|---|
| SCAT → ISM 自動連動 | **未実装** | `POST /scat/codes` に再計算フックを追加 |
| ISM 永続化 | **未実装** | `ism_analyses` テーブル + ルート |
| SP 表 自動生成 | **未実装** | `sp_tables` テーブル + ルート |
| 伝達係数 計算 | **未実装** | `transmission` 計算ロジック |
| `analysis_state` 管理 | **未実装** | テーブル新設 + フラグ運用 |
| キャッシュ無効化 | 部分実装 | `stats:scat:network` のみ。ISM/SP/T も追加 |
| UI ステータス表示 | placeholder | "再計算待ち" バッジ等 |

---

## 10. 実装ロードマップ (推奨順序)

1. **`analysis_state` テーブル新設** (migration)
2. **`src/utils/ism.ts` 実装** (隣接行列 → 可到達 → 階層 → 伝達係数の純粋関数群)
3. **`src/utils/sp_table.ts` 実装** (S-P 行列・注意係数)
4. **SCAT 更新フックの追加**
   - `POST /scat/codes`, `POST /scat/segments/:id`, `PUT /scat/projects/:id/theorization` に
     `await markScatDependentsDirty(db, scope)` を仕込む
5. **新規 API 追加**: `/ism/current`, `/sp-tables/current`, `/transmission/current`
6. **UI 改修**: 3 つの placeholder ページを実装、再計算ステータス表示
7. **E2E テスト追加**: `tests/e2e/scat_to_ism_propagation.spec.js`

---

## 11. 関連ドキュメント

- `docs/evaluation_model.md` — 4因子23項目モデル (本連動とは独立した上位概念)
- `docs/analysis/ism_spec.md` — ISM 単体仕様
- `docs/analysis/sp_table_spec.md` — SP 表単体仕様
- `docs/analysis/transmission_spec.md` — 伝達係数単体仕様
