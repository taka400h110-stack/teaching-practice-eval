# S-P 表 (Student-Problem Score Table) 分析 仕様

**Status**: Specification — 実装未完了 (現状は placeholder)
**Last Updated**: 2026-05-21
**Related**: `docs/analysis/ism_spec.md`

---

## 1. 目的

ISM 分析で抽出した **学習要素** を「問題 (Problem)」として、
複数の学生 (Student) の振り返り (= 日誌) にその要素が **表れているか / いないか** を
0/1 で表現する S-P 表 を作成し、

- 学生ごとの学習達成パターン
- 問題 (= 学習要素) ごとの定着度
- 個々のずれ (caution index) を可視化する

---

## 2. データ構造

### 2.1 基本形

```
            P1   P2   P3   P4   ...   Pm
    S1     [ 1    1    0    1   ...    0 ]
    S2     [ 1    0    1    1   ...    1 ]
    S3     [ 0    1    1    0   ...    1 ]
    ...
    Sn     [ 1    1    1    1   ...    0 ]
```

- 行: 学生 `S_1, ..., S_n`
- 列: 問題 (= ISM で抽出した学習要素) `P_1, ..., P_m`
- セル: `0` または `1`
  - `1` = その学生の振り返り (日誌) に該当要素が表れている
  - `0` = 表れていない

### 2.2 入力源

- **列 (問題)**: `docs/analysis/ism_spec.md` で定義する ISM 分析結果の **学習要素 (elements)**
- **行 (学生)**: 対象コース / コホート / 期間に属する学生群
- **セル値**: その学生の対象期間の **日誌 (振り返り)** に該当要素が出現するかを判定
  - 判定方法は ① キーワードマッチ、② AI 判定、③ 研究者の手動チェック のいずれか

---

## 3. 派生指標

### 3.1 学生通過率 `S_i` (行ごと)

```
S_i = (Σ_j cell[i][j]) / m
```

その学生が m 個の問題のうち何 % をクリアしたか。

### 3.2 問題正答率 `P_j` (列ごと)

```
P_j = (Σ_i cell[i][j]) / n
```

その問題が n 人の学生のうち何 % に出現したか (= 定着度の指標)。

### 3.3 並び替え

- 行を `S_i` の降順 (達成度の高い学生を上に)
- 列を `P_j` の降順 (定着している問題を左に)

並び替え後、理想的なケースでは **左上が 1 で埋まり、右下が 0 で埋まる** 階段状になる。

### 3.4 注意係数 (Caution Index)

並び替えで決まる「期待される 1 の位置」と「実際の 1 の位置」のズレを定量化する。

#### 3.4.1 学生の注意係数 `C*_i`

```
       Σ (P_j × (1 - cell[i][j]))     for j where P_j > S_i*m/n (= 期待される 1)
C*_i = ─────────────────────────────────────────
              Σ P_j  for j where ...
       -
       Σ (P_j × cell[i][j])           for j where P_j < S_i*m/n (= 期待される 0)
       ─────────────────────────────────────────
              Σ P_j  for j where ...
```

(田中, 1974 の原式に基づく。実装時は変種が複数あるので原書を参照のこと)

- `C*_i ≈ 0` : 想定どおりのパターン
- `C*_i > 0.5` : 警戒。「定着しているはずの問題で抜け」があるか「定着していない問題で偶然出現」がある
- `C*_i < 0` : 一般的でないパターン

#### 3.4.2 問題の注意係数 `C*_j`

行と同様に列ごとに計算。

---

## 4. データモデル提案

### 4.1 テーブル `sp_tables`

| カラム | 型 | 説明 |
|---|---|---|
| `id` | TEXT PK | S-P 表 ID |
| `ism_analysis_id` | TEXT | 元になる ISM 分析の ID |
| `scope` | TEXT | "course" / "cohort" / "custom" |
| `course_id` | TEXT | コース ID (scope=course の場合) |
| `cohort_id` | TEXT | コホート ID |
| `period_start` | DATETIME | 集計期間 |
| `period_end` | DATETIME | |
| `students_json` | TEXT (JSON) | `[{ id, name }]` 行の順序を保持 |
| `problems_json` | TEXT (JSON) | `[{ id, label }]` 列の順序を保持 |
| `matrix_json` | TEXT (JSON) | `number[n][m]` の 0/1 行列 |
| `student_caution_json` | TEXT (JSON) | `[C*_1, ..., C*_n]` |
| `problem_caution_json` | TEXT (JSON) | `[C*_1, ..., C*_m]` |
| `created_at` | DATETIME | |

### 4.2 API 提案

```
POST   /api/data/sp-tables                       # 自動生成 (ISM の elements × 学生群)
GET    /api/data/sp-tables/:id
PUT    /api/data/sp-tables/:id/cells             # セルを手動編集
GET    /api/data/sp-tables?course_id=...
```

---

## 5. UI 設計指針

### 5.1 ページ: `/research/journals/:journalId/sp-table`

現状は journal-id 単位の placeholder だが、本来は **コース or コホート単位** が自然。
ルートを `/research/sp-tables/:id` または `/research/courses/:courseId/sp-table` に再設計検討。

### 5.2 表示要素

1. **問題列ヘッダ** (横スクロール可、列ホバーで全文表示)
2. **学生行ヘッダ** (匿名化レベルを切替可能)
3. **0/1 セル** (色分け: `1` = 青塗、`0` = 白)
4. **行末**: `S_i` の通過率と `C*_i` を表示
5. **列下**: `P_j` の正答率と `C*_j` を表示
6. **並び替えボタン**: スコア順 / 名前順 / 元順
7. **エクスポート**: CSV / Excel (`/exports/requests` 連携)

---

## 6. 現状実装ギャップ

| 項目 | 現状 | 必要作業 |
|---|---|---|
| 0/1 判定ロジック | 未実装 | キーワード or AI 連携 |
| 行列計算 | なし | `src/utils/sp-table.ts` 新設 |
| 注意係数計算 | なし | 同上 |
| UI 表 | placeholder のみ | テーブルコンポーネント実装 |
| API ルート | なし | `src/api/routes/sp.ts` 新設 |
| DB | なし | `sp_tables` テーブル migration |

---

## 7. テストケース例

### 7.1 単体テスト (`tests/unit/sp_table.spec.ts`)

```typescript
const matrix = [
  [1,1,1,0],
  [1,1,0,0],
  [1,0,0,0],
];
const stats = computeSPStats(matrix);
expect(stats.studentScores).toEqual([0.75, 0.5, 0.25]);   // S_i
expect(stats.problemScores).toEqual([1.0, 0.67, 0.33, 0]); // P_j
```

### 7.2 E2E

ISM 分析を作成 → そこから SP 表を生成 → 期待される行列形状を返すか確認。

---

## 8. 参考文献

- 田中博之 (1974) 「学習指導におけるS-P表の活用」
- Sato, T. (1985). The S-P chart and the caution index. *NIME Research Bulletin*.
