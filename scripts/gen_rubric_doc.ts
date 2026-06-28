/**
 * gen_rubric_doc.ts
 * rubric.ts（単一の真実の源泉）から 6因子40項目ルーブリック Markdown を生成する。
 * 旧4因子版（4因子23項目ルーブリック_RD統一修正版_2026-03-07.md）と同じ体裁。
 */
import {
  RUBRIC_FACTORS,
  RUBRIC_ITEMS,
  REFLECTION_DEPTH_LEVELS,
  RUBRIC_STATS,
  getItemsByFactor,
} from "../src/constants/rubric";

const today = "2026-06-28";
const L: string[] = [];
const p = (s = "") => L.push(s);

// ── ヘッダ ─────────────────────────────────
p(`# 6因子40項目 教育実習評価ルーブリック（確定版・CFA確定版）`);
p(`**作成日：** ${today}`);
p(`**データ出典：** 論文に使う図表.xlsx（EFA パターン行列・プロマックス回転・最尤法／CFA にて 42→40 項目に精選）  `);
const alphaList = RUBRIC_FACTORS.map((f) => `α${f.roman} = ${f.alpha.toFixed(2)}`).join(", ");
p(`**統計的根拠：** Cronbach's α 全体 = ${RUBRIC_STATS.alphaOverall.toFixed(2)}；因子別 ${alphaList}  `);
p(`**モデル適合度（CFA）：** GFI = ${RUBRIC_STATS.cfa.gfi.toFixed(2)}, CFI = ${RUBRIC_STATS.cfa.cfi.toFixed(2)}, RMSEA = ${RUBRIC_STATS.cfa.rmsea.toFixed(2)}, SRMR = ${RUBRIC_STATS.cfa.srmr.toFixed(2)}  `);
p(`**相互参照：** →第3章 3.3.1, 第4章 4.3, 第5章 5.2, 第6章 6.2`);
p();
p(`> ✅ **改訂記録（${today}）**  `);
p(`> 旧版（4因子23項目）を全面改訂し、**6因子40項目**構造へ移行。  `);
const counts = RUBRIC_FACTORS.map((f) => f.itemRange[1] - f.itemRange[0] + 1);
p(`> 因子構成：${RUBRIC_FACTORS.map((f, i) => `因子${f.roman} ${counts[i]}項目`).join("・")}  `);
p(`> 合計 ${counts.join(" + ")} = **${counts.reduce((a, b) => a + b, 0)}項目**（✓）  `);
p(`> 全6因子・全40項目の行動指標を「点数 | RD水準 | 行動指標」の3列構成（Hatton & Smith 1995 省察深度 RD0–RD4）で統一。`);
p();
p(`---`);
p();

// ── 評価スケール定義 ────────────────────────
p(`## 評価スケール定義`);
p();
p(`| 点数 | ラベル | 行動指標の概要 |`);
p(`|:---:|:------|:-------------|`);
p(`| **5** | 非常に優れている | 深く理解し、根拠を伴って主体的・発展的に実践している。他者への示唆や省察も明確 |`);
p(`| **4** | 優れている | 適切に理解し、状況に応じて柔軟に実践できている。概ね自律的に行動できる |`);
p(`| **3** | 概ね達成 | 基本的な理解と実践ができているが、場面によっては支援・示唆が必要 |`);
p(`| **2** | 部分的達成 | 部分的に理解しているが、実践は断片的・受動的であり継続的支援が必要 |`);
p(`| **1** | 未達成 | 理解・実践ともに不十分であり、根本的な指導・介入が必要 |`);
p();
p(`---`);
p();

// ── RD対応表 ───────────────────────────────
p(`## 【全因子共通】Hatton & Smith（1995）省察深度（RD）水準対応表`);
p();
p(`> 本ルーブリックの全6因子・全40項目の5段階行動指標は、以下の省察深度（RD）水準と対応する。  `);
p(`> AI自動評価（CoT-A）・人間評価・自己評価のいずれにおいても、日誌記述の評価はこの対応に基づく。`);
p();
p(`| 点数 | RD水準 | 省察の特徴 |`);
p(`|:---:|:---:|:---|`);
// 高得点から並べる（5→1）
[...REFLECTION_DEPTH_LEVELS].reverse().forEach((r) => {
  p(`| **${r.score}** | **${r.rd} ${r.label}** | ${r.desc} |`);
});
p();
p(`---`);
p();

// ── 因子間相関表 ───────────────────────────
p(`## 因子間相関（プロマックス回転後）`);
p();
const head = ["因子", ...RUBRIC_FACTORS.map((f) => f.roman)].join(" | ");
const sep = [":---:", ...RUBRIC_FACTORS.map(() => ":---:")].join(" | ");
p(`| ${head} |`);
p(`| ${sep} |`);
RUBRIC_FACTORS.forEach((fr) => {
  const row = RUBRIC_FACTORS.map((fc) => {
    if (fr.key === fc.key) return "—";
    const v = (fr.interCorrelations as Record<string, number>)[fc.key];
    return v != null ? v.toFixed(3) : "";
  });
  p(`| **${fr.roman}** | ${row.join(" | ")} |`);
});
p();
p(`---`);
p();

// ── 各因子・各項目 ─────────────────────────
RUBRIC_FACTORS.forEach((f) => {
  const items = getItemsByFactor(f.key);
  const corr = Object.entries(f.interCorrelations)
    .map(([k, v]) => {
      const other = RUBRIC_FACTORS.find((x) => x.key === k);
      return other ? `${other.roman} r=${(v as number).toFixed(2)}` : "";
    })
    .filter(Boolean)
    .join(", ");
  p(`## 第${f.roman}因子：${f.label}（項目${f.itemRange[0]}–${f.itemRange[1]}）`);
  p(`**因子の定義：** ${f.definition}  `);
  p(`**α = ${f.alpha.toFixed(2)} ／ 因子間相関：${corr}**`);
  p();
  p(`> **【Hatton & Smith（1995）省察深度との対応原則】**  `);
  p(`> ${f.rdPrinciple}`);
  p();
  p(`---`);
  p();
  items.forEach((item) => {
    p(`### 項目${item.num}　${item.label}`);
    p(`**項目文：** ${item.text}  `);
    p(`**因子負荷量：** λ = ${item.lambda.toFixed(3)}`);
    p();
    p(`| 点数 | RD水準 | 行動指標（日誌記述の評価基準） |`);
    p(`|:---:|:---:|:--------|`);
    [...item.behaviors]
      .sort((a, b) => b.score - a.score)
      .forEach((b) => {
        const rd = REFLECTION_DEPTH_LEVELS.find((r) => r.rd === b.rd);
        const rdLabel = rd ? `${b.rd} ${rd.label}` : b.rd;
        p(`| **${b.score}** | ${rdLabel} | ${b.indicator} |`);
      });
    p();
    p(`---`);
    p();
  });
});

// ── 重み付け合計の算出方法 ────────────────────
p(`## 因子加重合計スコアの算出方法`);
p();
p(`総合評価は、各因子の平均得点を**因子内項目数**で重み付けして算出する（40項目を均等に1票とする方式）。`);
p();
p("```");
p(`加重合計 = (因子Ⅰ平均 × ${counts[0]} + 因子Ⅱ平均 × ${counts[1]} + 因子Ⅲ平均 × ${counts[2]}`);
p(`          + 因子Ⅳ平均 × ${counts[3]} + 因子Ⅴ平均 × ${counts[4]} + 因子Ⅵ平均 × ${counts[5]}) / ${counts.reduce((a, b) => a + b, 0)}`);
p("```");
p();
p(`| 因子 | 項目数 | 重み |`);
p(`|:---:|:---:|:---:|`);
const total = counts.reduce((a, b) => a + b, 0);
RUBRIC_FACTORS.forEach((f, i) => {
  p(`| ${f.roman} ${f.label} | ${counts[i]} | ${counts[i]}/${total} |`);
});
p(`| **合計** | **${total}** | **1.00** |`);
p();
p(`---`);
p();
p(`*本文書は \`src/constants/rubric.ts\`（システムの単一の真実の源泉）から自動生成された。*`);

process.stdout.write(L.join("\n") + "\n");
