# 評価モデル正式仕様

**Status**: Authoritative (確定仕様)
**Last Updated**: 2026-05-21
**Supersedes**: `docs/issues/evaluator_4_vs_21_design_conflict.md` の選択肢 A〜C

---

## 1. 評価フレーム

### 因子構造 (4 因子)

| 因子 | ローマ数字 | ラベル | 項目範囲 | 項目数 | α |
|---|---|---|---|---|---|
| Ⅰ | factor1 | 児童生徒への指導力 | 1–7 | 7 | .87 |
| Ⅱ | factor2 | 自己評価力 | 8–13 | 6 | .87 |
| Ⅲ | factor3 | 学級経営力 | 14–17 | 4 | .91 |
| Ⅳ | factor4 | 職務を理解して行動する力 | 18–23 | 6 | .91 |

**合計 23 項目**。各項目は 5 段階 (RD0–RD4) で評価される。

出典: 論文投稿用.docx EFA パターン行列・プロマックス回転・最尤法
全体 α = .95、CFA: CFI = .94, RMSEA = .06, SRMR = .06, GFI = .83

---

## 2. 評価入力ポリシー (確定)

### 2.1 AI による評価

- **入力粒度**: **23 項目を 1 項目ずつ** 5 段階評価
- **集計方法**: 因子ごとに項目スコアを**算術平均**し、4 因子スコアを算出
- **実装**: `POST /api/openai/evaluate` (CoT-A temperature=0.2)
- **保存先**: `evaluations` テーブル + `evaluation_items` テーブル (23 項目)

```
factor1_score = mean(item1.score, item2.score, ..., item7.score)
factor2_score = mean(item8.score, ..., item13.score)
factor3_score = mean(item14.score, ..., item17.score)
factor4_score = mean(item18.score, ..., item23.score)
```

### 2.2 人 (Human) による評価

- **入力粒度**: **4 因子を直接評価** (項目別評価は実施しない)
- **複数評価者の場合**: 評価者間の値を**算術平均**してから ICC 等に使用
- **単一評価者の場合**: その評価者の値をそのまま使用
- **実装**: `POST /api/data/human-evals` (`HumanEvaluationPage`)
- **保存先**: `human_evaluations` テーブル + `human_eval_items` テーブル (4 因子分のみ)

```
- 人評価者 A: {factor1: 4, factor2: 5, factor3: 3, factor4: 4}
- 人評価者 B: {factor1: 5, factor2: 4, factor3: 4, factor4: 4}
- 集計値:     {factor1: 4.5, factor2: 4.5, factor3: 3.5, factor4: 4.0}
```

### 2.3 「23 項目 vs 4 因子」設計衝突の決着

監査 (2026-05) で発生していた以下の誤解は本仕様で解消する:

| 誤解 | 正解 |
|---|---|
| 「人も 23 項目を入力すべきか?」 | **いいえ。人は 4 因子のみ**。23 項目は AI 専用 |
| 「ICC は 23 項目で取るのか?」 | **いいえ。ICC は 4 因子レベル** (AI 集計値 vs 人評価値) |
| 「画面に 23 項目入力欄が出るのは正しいか?」 | **いいえ**。`HumanEvaluationPage` の項目別入力欄は削除予定 (TODO) |

---

## 3. 統計指標の対象

### 3.1 ICC (級内相関係数)

- **対象**: **4 因子レベル** で AI スコア (集計後) vs 人スコア (集計後) を比較
- **因子別 ICC を 4 種出す** + 全体 ICC (4 因子平均) を 1 種、計 5 値
- `factor` カラムには `factor1`〜`factor4` または `total` を入れる
- 旧データで `factor` に項目 ID が入っているレコードは廃止予定

### 3.2 Krippendorff α / Pearson r

ICC と同様、**4 因子レベル** で計算する。

### 3.3 23 項目レベルの統計

23 項目の値は AI 内部の生スコアとしてのみ保持。  
23 項目レベルでの ICC や α は **取らない** (人側の入力がないため理論的に算出不可)。  
研究用途で 23 項目分析が必要な場合は、AI 評価のみの内的整合性 (α) のみ算出可能。

---

## 4. UI 設計指針

### 4.1 評価入力ページ (`HumanEvaluationPage`)
- 表示するのは **4 因子の入力欄のみ** (23 項目入力欄は今後削除)
- 4 因子それぞれに 5 段階スライダ + コメント欄

### 4.2 評価結果ページ (`EvaluationResultPage`)
- **AI 結果**: 4 因子スコア (大) + 23 項目内訳 (折り畳み、参考表示)
- **人結果**: 4 因子スコア (大) のみ
- **比較**: 4 因子レーダーチャートで AI vs 人を重ね描き

### 4.3 信頼性分析ページ (`ReliabilityAnalysisPage`)
- 因子別 ICC (4 種) + 全体 ICC をテーブル表示
- 「これは 4 因子レベルの一致度です」と明記

---

## 5. API 契約

### 5.1 `POST /api/data/human-evals`

```jsonc
{
  "journal_id": "journ_xxx",   // 必須
  "items": [                    // 必須、長さ 4 (= 4 因子)
    { "factor": "factor1", "score": 4, "comment": "..." },
    { "factor": "factor2", "score": 5, "comment": "..." },
    { "factor": "factor3", "score": 3, "comment": "..." },
    { "factor": "factor4", "score": 4, "comment": "..." }
  ]
}
```

将来的なバリデーション強化 (TODO):
- `items.length === 4` をサーバ側で必須化
- `items[].factor` は `factor1|factor2|factor3|factor4` のいずれかに限定
- `items[].score` は 1–5 の整数に限定

### 5.2 `POST /api/data/icc-results`

```jsonc
{
  "scope": "course",                    // 必須
  "factor": "factor1",                  // factor1|factor2|factor3|factor4|total
  "icc_value": 0.83,                    // 必須
  "ci_lower": 0.71, "ci_upper": 0.89,
  "rater_count": 3,                     // 人評価者の人数 (1 でも可)
  "subject_count": 24                   // 比較対象の日誌数
}
```

---

## 6. 既存データのマイグレーション計画

1. `human_eval_items.factor` カラムが項目 ID (1–23) を含むレコードを抽出
2. 因子定義表 (`RUBRIC_FACTORS[].itemRange`) に基づいて該当因子に集約
3. 重複する場合は **平均化** して 4 因子レコードに正規化
4. `icc_results.factor` カラムの非正規値を `total` に正規化、または削除

別タスクとして実施 (本ドキュメントの範囲外)。

---

## 7. 参考文献

- Hatton & Smith (1995). Reflection in teacher education: Towards definition and implementation. *Teaching and Teacher Education*, 11(1), 33-49.
- Shrout & Fleiss (1979). Intraclass correlations: Uses in assessing rater reliability.
- Krippendorff (2018). *Content Analysis: An Introduction to Its Methodology* (4th ed.)
