# ISM (Interpretive Structural Modeling) 分析 仕様

**Status**: Specification — 実装未完了 (現状は placeholder)
**Last Updated**: 2026-05-21
**Related**: `docs/analysis/sp_table_spec.md`, `docs/analysis/transmission_spec.md`

---

## 1. 目的

実習日誌中に表れる学習要素（概念・行動・気づき等）の **構造関係** を可視化し、
要素間の階層・依存・伝達関係を明らかにする。
これにより、学生の省察が「どの概念から始まり、どこに到達したか」を構造的に把握できる。

## 1.1 上流データ源 (重要)

**ISM の入力ネットワーク構造は SCAT 分析から自動生成される** (ユーザ指示 2026-05-21)。

- 入力: `GET /api/data/scat/network` の `{ nodes, edges }`
  - ノード = SCAT の `step4_theme` (テーマ) をパースして得たユニーク値
  - エッジ = 同一グループ (= 同一日誌 / 同一プロジェクト) 内で共起するテーマペア
- **ISM の隣接行列 A は SCAT のエッジ重みを 0/1 に二値化したもの**
- SCAT の `step4_theme` が更新されるたびに **ISM・SP表・伝達係数を自動再計算**
- 詳細: `docs/analysis/scat_to_ism_pipeline.md`

---

## 2. パイプライン

```
[日誌テキスト]
   │
   ▼ ① 要素抽出 (概念ノード抽出)
[ネットワーク構造 / 概念グラフ]
   │
   ▼ ② 隣接関係の判定
[隣接行列 A]                    ← n × n の {0,1} 行列
   │
   ▼ ③ ワーシャル–フロイド or 反復ブール積で推移閉包
[可到達行列 R]                  ← n × n の {0,1} 行列 (R = (A ∪ I)^(n-1))
   │
   ▼ ④ レベル分割 (Warfield 法)
[階層構造図 (Hierarchy DAG)]
   │
   ▼ ⑤ 伝達係数 (Transmission Index) 算出
[伝達係数スコア]                ← docs/analysis/transmission_spec.md
```

---

## 3. 数式定義

### 3.1 隣接行列 A

`n` 個の学習要素 `e_1, e_2, ..., e_n` について:

```
A[i][j] = 1   要素 e_i から e_j へ直接の関係がある場合
A[i][j] = 0   そうでない場合
```

「関係がある」の判定:
- 日誌内で `e_i → e_j` の方向性のある共起 (因果・時系列・帰結など)
- AI 判定 (`POST /api/openai/scat-analysis` でも代用可) または研究者の手動入力

### 3.2 可到達行列 R

恒等行列 `I` を加えて自己ループを許した上で、推移閉包を計算:

```
M = A ∪ I  (= A + I の各要素を {0,1} にクリップ)
R = M^(n-1)  (ブール積)
```

または Warshall アルゴリズム:

```python
R = M.copy()
for k in range(n):
    for i in range(n):
        for j in range(n):
            R[i][j] = R[i][j] or (R[i][k] and R[k][j])
```

### 3.3 レベル分割 (Warfield 法)

各要素 `e_i` について以下を計算:

- **可到達集合** `R(e_i) = { e_j | R[i][j] = 1 }`
- **先行集合** `A(e_i) = { e_j | R[j][i] = 1 }`
- **共通集合** `R(e_i) ∩ A(e_i)`

```
Level 1: R(e_i) ∩ A(e_i) == R(e_i) を満たす要素 (=最も上位の到達点)
   ↓ これらを除外して再計算
Level 2: 残りの要素で同じ条件
   ↓
Level k: ... (収束まで反復)
```

### 3.4 階層構造図

レベル分割の結果を上から順に並べ、隣接行列 `A` の関係を矢印で表示する有向非循環グラフ (DAG)。

---

## 4. データモデル提案

### 4.1 テーブル `ism_analyses`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | TEXT PK | 分析ID |
| `journal_id` | TEXT | 対象日誌 (1 日誌 1 分析 or 複数日誌統合) |
| `scope` | TEXT | "single_journal" / "weekly" / "cohort" 等 |
| `elements_json` | TEXT (JSON) | `[{ "id": "e1", "label": "..." }, ...]` |
| `adjacency_json` | TEXT (JSON) | 隣接行列 `number[n][n]` |
| `reachability_json` | TEXT (JSON) | 可到達行列 (キャッシュ) |
| `levels_json` | TEXT (JSON) | `[[e1,e3], [e2], [e4,e5]]` レベル別 |
| `transmission_score` | REAL | 伝達係数 (詳細は別仕様) |
| `created_by` | TEXT | researcher_id |
| `created_at` | DATETIME | |

### 4.2 API 提案

```
POST   /api/data/ism/analyses                  # 分析を作成 (隣接行列まで)
GET    /api/data/ism/analyses/:id              # 1 件取得 (可到達・階層を含む)
POST   /api/data/ism/analyses/:id/compute      # 可到達・階層を再計算
GET    /api/data/ism/analyses?journal_id=...   # 一覧
```

---

## 5. UI 設計指針

### 5.1 ページ: `/research/journals/:journalId/ism`

現在の placeholder を以下のセクション構成に拡張:

1. **要素一覧** (Chip 群、ラベル編集可)
2. **隣接行列エディタ** (n × n の表、クリックで 0/1 切替)
3. **可到達行列** (計算ボタンで生成、ヒートマップ表示)
4. **階層構造図** (cytoscape.js または d3-dag で DAG 描画)
5. **伝達係数表示** (transmission_spec.md 参照)
6. **エクスポート** (PNG / SVG / JSON)

### 5.2 推奨ライブラリ

- グラフ描画: `cytoscape` (既存依存) または `react-flow`
- 行列計算: 自前実装で十分 (n が 20 程度想定)

---

## 6. 現状実装ギャップ

| 項目 | 現状 | 必要作業 |
|---|---|---|
| 要素抽出 | **SCAT `step4_theme` から自動 (実装済)** | `GET /scat/network` を流用するだけで OK |
| 隣接行列の生成 | SCAT 共起から **自動派生する設計**。手動入力 UI は不要 | SCAT エッジ重み → 0/1 二値化のヘルパ実装 |
| 可到達行列計算 | なし | Warshall を `src/utils/ism.ts` に実装 |
| レベル分割 | なし | 同上 |
| DAG 描画 | なし | cytoscape ラッパ |
| API ルート | なし | `src/api/routes/ism.ts` 新設 |
| DB スキーマ | なし | `ism_analyses` テーブル追加 (migration) |
| **SCAT 連動再計算** | **未実装** | `POST /scat/codes` 等にフック追加 (詳細: `scat_to_ism_pipeline.md`) |

> ⚠️ **重要設計原則**: ユーザ直接編集の隣接行列エディタは設けない。
> ISM は **SCAT ネットワークから一意に導出される派生データ** とする (single source of truth = SCAT)。

---

## 7. テストケース例

### 7.1 単体テスト (`tests/unit/ism.spec.ts`)

```typescript
// 既知の小規模例
const A = [
  [0,1,0,0],
  [0,0,1,0],
  [0,0,0,1],
  [0,0,0,0],
];
// 可到達行列は対角を加えると上三角全て 1 の鎖構造
expect(reachability(A)).toEqual([
  [1,1,1,1],
  [0,1,1,1],
  [0,0,1,1],
  [0,0,0,1],
]);
// レベル分割は逆順: [[e4], [e3], [e2], [e1]]
expect(levelPartition(A)).toEqual([['e4'],['e3'],['e2'],['e1']]);
```

### 7.2 E2E (`tests/e2e/ism_pipeline.spec.js`)

researcher としてログイン → ISM 分析作成 → 隣接行列入力 → compute → 階層が返ることを確認。
