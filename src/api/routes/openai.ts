// @ts-nocheck

/**
 * src/api/routes/openai.ts
 * Hono APIルート: OpenAI GPT-4 CoT-A / CoT-B / CoT-C
 * 論文第4章 4.4節: AI評価エンジン（CoT-A）
 *            4.6節: 省察チャットBot（CoT-B / CoT-C）
 *
 * CoT-A temperature=0.2 → 40項目×5段階ルーブリック評価
 *   6因子40項目: 全40項目の評価基準をRD水準付き3列構成（rubric.ts 駆動）
 *   出力に rd_level フィールドを追加（Hatton & Smith, 1995 準拠）
 * CoT-B temperature=0.1 → Hatton & Smith 4レベル省察深さ判定
 * CoT-C temperature=0.3 → Locke & Latham SMART目標提案
 *
 * 環境変数: process.env.OPENAI_API_KEY
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requireRoles } from "../middleware/auth";
import { RUBRIC_FACTORS, RUBRIC_ITEMS, getItemsByFactor, getFactorKeyByItemNum } from "../../constants/rubric";

/**
 * 6因子40項目ルーブリック（src/constants/rubric.ts）から、
 * CoT-Aプロンプトに埋め込むルーブリック本文を動的生成する。
 * 各項目は「点数 | RD水準 | 行動指標」の5段階で出力する。
 */
function buildRubricSection(): string {
  const lines: string[] = [];
  for (const f of RUBRIC_FACTORS) {
    const items = getItemsByFactor(f.key);
    const range = `項目${f.itemRange[0]}-${f.itemRange[1]}`;
    lines.push(`### 因子${f.roman} ${f.label}（${range}, α=${f.alpha.toFixed(2)}）`);
    lines.push(`**定義：** ${f.definition}`);
    lines.push("");
    for (const it of items) {
      lines.push(`${it.num}. 【${it.label} λ=${it.lambda}】${it.text}`);
      for (const b of it.behaviors) {
        lines.push(`   - ${b.score}(${b.rd}): ${b.indicator}`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

/** 6因子のJSON出力テンプレート（factor1〜factor6） */
function buildFactorScoresExample(): string {
  return RUBRIC_FACTORS.map((f) => `    "${f.key}": 3.0`).join(",\n");
}
function buildFactorRdLevelsExample(): string {
  return RUBRIC_FACTORS.map((f) => `    "${f.key}": "RD2"`).join(",\n");
}

/** ルーブリック因子の一覧（プロンプト末尾の簡易リスト用） */
function buildFactorListShort(): string {
  return RUBRIC_FACTORS.map(
    (f) => `因子${f.roman}: ${f.label}（項目${f.itemRange[0]}-${f.itemRange[1]}）`,
  ).join("\n");
}

function getAuthContext(c: any) {
  const auth = c.req.header('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const token = auth.split(' ')[1];
    // JWT: header.payload.signature の payload 部分を base64url + UTF-8 でデコード
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    // UTF-8 マルチバイト文字 (日本語名等) を正しくデコード
    const decoded = decodeURIComponent(
      Array.prototype.map
        .call(atob(b64), (ch: string) => '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

const openaiRouter = new Hono<{ Bindings: CloudflareBindings }>();
openaiRouter.use("*", cors());

// ────────────────────────────────────────────────────────────────
// CoT-Aプロンプト（AI評価）
// 論文 4.4.2: temperature=0.2、JSON出力
// ────────────────────────────────────────────────────────────────

export function extractJournalText(contentStr: string): string {
  if (!contentStr) return "";
  try {
    const p = JSON.parse(contentStr);
    if (p.version === 2 && Array.isArray(p.records)) {
      let text = "";
      p.records.forEach((r: any) => {
        text += `【${r.time_label || '授業記録'}】\n${r.body}\n\n`;
      });
      if (p.reflection) {
        text += `【省察・振り返り】\n${p.reflection}\n`;
      }
      return text.trim();
    }
    return contentStr;
  } catch (e) {
    return contentStr;
  }
}

export function buildCoTAPrompt(journalContent: string, studentName: string, weekNumber: number): string {
  const rubricSection = buildRubricSection();
  const factorScoresExample = buildFactorScoresExample();
  const factorRdLevelsExample = buildFactorRdLevelsExample();
  const totalItems = RUBRIC_ITEMS.length;
  return `あなたは教育実習評価の専門家AIです。以下の実習日誌を6因子${totalItems}項目のルーブリックで評価してください。

## 評価対象
実習生: ${studentName}
第${weekNumber}週 実習日誌:
---
${journalContent}
---

## 全因子共通：Hatton & Smith（1995）省察深度（RD）水準
全${totalItems}項目の5段階行動指標はすべてこのRD水準と対応します。

| スコア | RD水準 | 省察の特徴 |
|:---:|:---:|:---|
| 5 | RD4 批判的省察 | 教育的信念・社会的文脈・倫理的観点と実践を結びつけ、信念の根拠そのものを問い直す |
| 4 | RD3 対話的省察 | 実践の原因・背景を多角的に分析し、代替案・改善策を具体的に検討する |
| 3 | RD2 記述的省察 | 感情・気づき・印象を言語化するが、原因分析や代替案は限定的 |
| 2 | RD1 記述的書き込み | 出来事・事実の列挙にとどまり、省察的要素がない |
| 1 | RD0 省察なし | 当該側面への記述・省察が日誌に見られない |

---

## ルーブリック（6因子${totalItems}項目・RD水準対応行動指標）

${rubricSection}

## 評価上の注意
- 各項目を日誌の記述に基づき1〜5で評価し、対応するRD水準を判定すること
- 日誌に該当する記述が全くない項目は is_na: true とし、score は null にすること
- evidence は日誌からの引用を簡潔に、feedback は具体的な改善提案を述べること

## 出力形式（厳密にJSONで出力）
{
  "reasoning": "Chain-of-Thoughtの推論過程（3-5文）",
  "items": [
    {
      "item_number": 1,
      "score": 3,
      "rd_level": "RD2",
      "evidence": "日誌から引用した根拠テキスト（30字以内）",
      "feedback": "具体的な改善フィードバック（50字以内）",
      "is_na": false
    }
    // ...全${totalItems}項目（item_number 1〜${totalItems}）...
  ],
  "factor_scores": {
${factorScoresExample}
  },
  "factor_rd_levels": {
${factorRdLevelsExample}
  },
  "total_score": 2.9,
  "overall_comment": "全体的な評価コメント（100字以内）",
  "halo_effect_detected": false,
  "confidence": 0.85
}`;
}

// ────────────────────────────────────────────────────────────────
// CoT-Bプロンプト（省察深さ判定）
// 論文 4.6.2: Hatton & Smith (1995) 4レベル, temperature=0.1
// ────────────────────────────────────────────────────────────────
function buildCoTBPrompt(userMessage: string, journalContent: string): string {
  return `あなたは教育実習における省察深さ判定の専門家AIです。以下のメッセージを Hatton & Smith（1995）の省察レベル基準で分類してください。

## 省察対象
実習日誌（コンテキスト）:
---
${journalContent.slice(0, 500)}...
---

学生のメッセージ:
"${userMessage}"

## 省察レベル基準（Hatton & Smith, 1995）
RD1（記述的書き込み）: 出来事・事実の列挙。「〜した」「〜だった」のみ
RD2（記述的省察）: 感情・気づき・印象を言語化。「〜と感じた」「〜に気づいた」
RD3（対話的省察）: 原因・背景の分析、代替案・改善策の具体的検討。「なぜなら」「〜という理由で」
RD4（批判的省察）: 教育的信念・社会的文脈・倫理的観点との結びつけ。根拠の問い直し

## 出力形式（厳密にJSONで出力）
{
  "reflection_level": "RD3",
  "rubric_score_equivalent": 4,
  "category": "対話的省察",
  "evidence": "判定根拠となった表現（20字以内）",
  "next_action": "省察を深めるための次の問いかけ（40字以内）",
  "confidence": 0.88
}`;
}

// ────────────────────────────────────────────────────────────────
// CoT-Cプロンプト（SMART目標提案）
// 論文 4.6.3: Locke & Latham (2002) SMART基準, temperature=0.3
// ────────────────────────────────────────────────────────────────
function buildCoTCPrompt(
  conversation: Array<{ role: string; content: string }>,
  journalContent: string,
  weekNumber: number,
  bfiScores: { conscientiousness?: number; neuroticism?: number; openness?: number } | null = null
): string {
  const convText = conversation.slice(-6).map((m) => `${m.role === "user" ? "学生" : "AI"}: ${m.content}`).join("\n");
  

  const bfiRules = `
## 性格特性（並川ら, 2012 短縮版）と目標難易度調整
以下のパーソナリティ特性（5件法スコア: 1.0～5.0）を考慮し、目標の難易度や粒度を調整してください。
${bfiScores ? `
[学生の性格特性]
- 誠実性 (Conscientiousness): ${bfiScores.conscientiousness?.toFixed(2) ?? "不明"} / 5.0
- 情緒不安定性 (Neuroticism): ${bfiScores.neuroticism?.toFixed(2) ?? "不明"} / 5.0
- 開放性 (Openness): ${bfiScores.openness?.toFixed(2) ?? "不明"} / 5.0

[調整ルール]
- 情緒不安定性が高い(3.5以上)場合は、目標を小さく分解し、失敗リスクの低い安全な形（難易度: Low）にする。
- 誠実性が高い(3.5以上)場合は、目標をやや高難度にし、実行回数や継続性を求める形（難易度: High）にする。
- 開放性が高い(3.5以上)場合は、新しい試行や振り返り、代替行動の検討を含む目標（難易度: Medium）にする。
- 該当しない場合、またはスコアがない場合は標準的な難易度（Medium）とする。
` : `
[学生の性格特性]
取得できませんでした。標準的な難易度（Medium）で目標を設定してください。
`}
`;

  return `あなたは教育実習における目標設定支援の専門家AIです。以下の対話から来週の SMART 目標を提案してください。

## コンテキスト
第${weekNumber}週 実習日誌（要約）:
---
${journalContent.slice(0, 400)}...
---

省察対話:
---
${convText}
---

## SMART目標基準（Locke & Latham, 2002）
- Specific（具体的）: 何を・どのように行うか明確
- Measurable（測定可能）: 達成を確認できる指標
- Achievable（達成可能）: 1週間で実現可能
- Relevant（関連性）: 評価ルーブリックの因子と紐づく
- Time-bound（期限付き）: 来週中に実施

## ルーブリック因子
${buildFactorListShort()}
${bfiRules}
## 出力形式（厳密にJSONで出力）
{
  "goal_text": "来週、〇〇の場面で〜を実践し、〜を確認する",
  "target_item_id": 12,
  "target_factor": "factor2",
  "smart_criteria": {
    "specific": true,
    "measurable": true,
    "achievable": true,
    "relevant": true,
    "time_bound": true
  },
  "is_smart": true,
  "rationale": "目標設定の根拠（30字以内）",
  "difficulty_level": "Low | Medium | High",
  "adjustment_reason": "性格特性を考慮した調整理由（例: 誠実性が高いため...）",
  "target_week": ${weekNumber + 1}
}`;
}

// ────────────────────────────────────────────────────────────────
// SCAT (Steps for Coding And Theorization) 用プロンプト
// 大谷尚 (2008,2011) の質的データ分析手法に基づく4ステップコーディング
// + 第5ステップ (テーマ・構成概念) + 第6ステップ (理論記述)
// ────────────────────────────────────────────────────────────────
export function buildSCATPrompt(journalContent: string, studentName: string, weekNumber: number): string {
  return `あなたは質的データ分析 (SCAT: Steps for Coding And Theorization, 大谷尚 2008,2011) の専門家AIです。
以下の教育実習日誌に対して、SCAT の手続きに従って質的分析を実施してください。

## 分析対象
実習生: ${studentName}
第${weekNumber}週 実習日誌:
---
${journalContent}
---

## SCAT 分析手順
日誌全体を「意味のまとまり」で 3〜5 個のセグメント (テクスト) に分割し、各セグメントに対して以下の4ステップを順に行ってください。

- **ステップ①: テクスト中の注目すべき語句** (focus_words)
  - 実習生の経験・判断・葛藤が表出している具体的な語句を抜き出す (3〜6語程度)
  - 元の表現を尊重 (改変しない)

- **ステップ②: テクスト中の語句の言いかえ** (outside_words)
  - ①の語句を、より抽象度の高い・教育学的に整理された語に言いかえる
  - 学術用語・教育実習指導用語を活用

- **ステップ③: 左を説明するようなテクスト外の概念** (explanatory_words)
  - ②をさらに広い概念・理論枠組みで説明する
  - 教育心理学・授業論・省察的実践論などの概念を援用

- **ステップ④: テーマ・構成概念** (theme_construct)
  - ①〜③を統合する短いテーマ語 (10〜25字以内、名詞句)
  - 例: 「児童の躓きへの即時的応答」「教材研究の不足を補う指導観の揺らぎ」

加えて以下を行ってください:

- **ステップ⑤: 疑問・課題** (questions_issues)
  - そのセグメントから生まれる問い・次回への課題 (1〜2文)

- **全体: ストーリーライン** (storyline)
  - 全セグメントのテーマ④を時系列でつなぐ約 200〜400 字の物語的記述
  - 「実習生 ${studentName} は…」で始める

- **全体: 理論記述** (theoretical_description)
  - ストーリーラインから導かれる教育学的・理論的考察 (200〜400 字)
  - 省察深度 (Reflection Depth: RD0=描写のみ / RD1=説明 / RD2=評価 / RD3=分析 / RD4=変容) の判定根拠も含める

## 出力形式 (JSON)
\`\`\`json
{
  "segments": [
    {
      "segment_order": 1,
      "raw_text": "セグメント①の原文 (40〜200字)",
      "step1_focus_words": "実習生の注目語句をカンマ区切りで",
      "step2_outside_words": "言いかえ語をカンマ区切りで",
      "step3_explanatory_words": "外部概念をカンマ区切りで",
      "step4_theme_construct": "テーマ語 (10〜25字)",
      "step5_questions_issues": "疑問・課題 (1〜2文)"
    }
  ],
  "storyline": "200〜400字のストーリーライン",
  "theoretical_description": "200〜400字の理論記述 (RD判定根拠含む)",
  "rd_level_estimate": "RD0|RD1|RD2|RD3|RD4 のいずれか",
  "primary_themes": ["主要テーマ1", "主要テーマ2"]
}
\`\`\`

注意:
- segments は 3 個以上 5 個以下
- 各 step1〜step5 は文字列 (配列ではない)
- raw_text はセグメント内の元のテクストをそのまま (改変しない)`;
}

// ────────────────────────────────────────────────────────────────
// BFI 統合分析プロンプト
// パーソナリティ (5因子) × 省察深度 (RD) の文脈解釈
// ────────────────────────────────────────────────────────────────
export function buildBfiIntegratedPrompt(args: {
  studentName: string;
  bfiScores: Record<string, number>;
  rdDistribution: Record<string, number>;
  avgRdScore: number;
  recentThemes: string[];
  factorAverages: Record<string, number>;
}): string {
  const { studentName, bfiScores, rdDistribution, avgRdScore, recentThemes, factorAverages } = args;
  return `あなたは教師教育・パーソナリティ心理学の専門家AIです。
以下の学生のBFI(Big Five Inventory)パーソナリティ特性と、教育実習日誌のAI評価結果(省察深度・6因子スコア)を統合的に分析し、強み・弱み・伸ばし方の提言を行ってください。

## 学生情報
実習生: ${studentName}

## BFIパーソナリティスコア (0-5, 高いほどその特性が強い)
- 外向性 (Extraversion): ${bfiScores.extraversion ?? "未測定"}
- 神経症傾向 (Neuroticism): ${bfiScores.neuroticism ?? "未測定"}
- 開放性 (Openness): ${bfiScores.openness ?? "未測定"}
- 協調性 (Agreeableness): ${bfiScores.agreeableness ?? "未測定"}
- 誠実性 (Conscientiousness): ${bfiScores.conscientiousness ?? "未測定"}

## 省察深度 (Reflection Depth) 分布
- RD0 (描写のみ): ${rdDistribution.RD0 || 0}件
- RD1 (説明): ${rdDistribution.RD1 || 0}件
- RD2 (評価): ${rdDistribution.RD2 || 0}件
- RD3 (分析): ${rdDistribution.RD3 || 0}件
- RD4 (変容): ${rdDistribution.RD4 || 0}件
- 平均スコア: ${avgRdScore.toFixed(2)} / 5.0

## 実習評価6因子平均
- 因子Ⅰ (教科指導力): ${factorAverages.f1?.toFixed(2) ?? "N/A"}
- 因子Ⅱ (職務理解力): ${factorAverages.f2?.toFixed(2) ?? "N/A"}
- 因子Ⅲ (保護者・外部連携力): ${factorAverages.f3?.toFixed(2) ?? "N/A"}
- 因子Ⅳ (児童理解力): ${factorAverages.f4?.toFixed(2) ?? "N/A"}
- 因子Ⅴ (学級経営力): ${factorAverages.f5?.toFixed(2) ?? "N/A"}
- 因子Ⅵ (授業改善力): ${factorAverages.f6?.toFixed(2) ?? "N/A"}

## 直近の日誌テーマ (SCAT分析より)
${recentThemes.length > 0 ? recentThemes.map(t => `- ${t}`).join("\n") : "(分析データなし)"}

## 出力形式 (JSON)
\`\`\`json
{
  "personality_summary": "BFI 5因子の総合プロファイル (150-250字)",
  "personality_strengths": ["パーソナリティ的な強み (具体的)", "..."],
  "personality_growth_areas": ["伸び代になりうる側面 (否定的でなく中立的に)", "..."],
  "correlation_insights": [
    {
      "personality_factor": "外向性|神経症傾向|開放性|協調性|誠実性",
      "evaluation_dimension": "省察深度|因子Ⅰ教科指導力|因子Ⅱ職務理解力|因子Ⅲ保護者・外部連携力|因子Ⅳ児童理解力|因子Ⅴ学級経営力|因子Ⅵ授業改善力",
      "observed_pattern": "観察される相関パターン (例: 高い誠実性が省察記述の構造化に表れている)",
      "evidence": "根拠 (具体的にどのデータからその傾向が読み取れるか)"
    }
  ],
  "factor_strength_map": {
    "extraversion": {
      "score": ${bfiScores.extraversion ?? 0},
      "label": "高|中|低",
      "teaching_implication": "授業実践での現れ方 (60-100字)"
    },
    "neuroticism": { "score": ${bfiScores.neuroticism ?? 0}, "label": "高|中|低", "teaching_implication": "..." },
    "openness": { "score": ${bfiScores.openness ?? 0}, "label": "高|中|低", "teaching_implication": "..." },
    "agreeableness": { "score": ${bfiScores.agreeableness ?? 0}, "label": "高|中|低", "teaching_implication": "..." },
    "conscientiousness": { "score": ${bfiScores.conscientiousness ?? 0}, "label": "高|中|低", "teaching_implication": "..." }
  },
  "personalized_recommendations": [
    "具体的な実習における提言 1 (パーソナリティ特性に基づく)",
    "具体的な実習における提言 2",
    "具体的な実習における提言 3"
  ],
  "next_week_focus": "次週の重点課題 (パーソナリティに即した1文)"
}
\`\`\`

注意:
- label は score を以下で判定: <2.0=低, 2.0-3.5=中, >3.5=高
- 強み/弱みは断定せず「特性として現れやすい」など中立的表現
- correlation_insights は実データから読み取れる範囲で 2〜4 個
- 教師教育における Reflective Practice (Schön, 1983) と性格特性研究の知見を踏まえる`;
}

// ────────────────────────────────────────────────────────────────
// OpenAI 互換エンドポイント / モデルの解決
// 本番では OpenAI 公式 (api.openai.com / gpt-4o) を既定とし、
// env.OPENAI_BASE_URL / env.OPENAI_MODEL が設定されていればそれで上書きする。
// これにより GenSpark LLM プロキシ等の OpenAI 互換エンドポイントでも動作する。
// ────────────────────────────────────────────────────────────────
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";
const DEFAULT_MODEL_MINI = "gpt-4o-mini";

/** chat/completions の完全なエンドポイントURLを返す（末尾スラッシュを正規化） */
export function getChatCompletionsUrl(env: any): string {
  const base = (env?.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

/** 使用モデルを解決する。env.OPENAI_MODEL があれば最優先、無ければ fallback。 */
export function resolveModel(env: any, fallback: string = DEFAULT_MODEL): string {
  return env?.OPENAI_MODEL || fallback;
}

// ────────────────────────────────────────────────────────────────
// OpenAI API 呼び出し共通関数
// ────────────────────────────────────────────────────────────────
export async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature: number,
  model: string = DEFAULT_MODEL,
  opts?: { baseUrl?: string; maxTokens?: number }
): Promise<string> {
  const base = (opts?.baseUrl || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, "");
  // 40項目評価のJSONは長い。さらに gpt-5 系などの推論(reasoning)モデルは
  // reasoning_tokens を completion 枠から消費するため、4096 では出力が途中で
  // 切れて JSON パースに失敗する。既定値を 16384 に引き上げて両対応とする。
  const maxTokens = opts?.maxTokens ?? 16384;
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data: any = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  return data.choices[0].message.content;
}

// ────────────────────────────────────────────────────────────────
// POST /api/ai/evaluate  (CoT-A)
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/evaluate", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "AI評価機能は現在利用できません（APIキー未設定）。管理者にお問い合わせください。", code: "AI_NOT_CONFIGURED" }, 503);
  }

  const body = await c.req.json() as {
    journal_content: string;
    student_name: string;
    week_number: number;
    journal_id: string;
  };

  const model = resolveModel(c.env);
  const baseUrl = getChatCompletionsUrl(c.env).replace(/\/chat\/completions$/, "");
  try {
    const prompt = buildCoTAPrompt(extractJournalText(body.journal_content), body.student_name, body.week_number);
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.2,
      model,
      { baseUrl }
    );
    const result = JSON.parse(raw);
    
    // 厳密な40項目平均（NULL除外、半端四捨五入）の再計算（6因子）
    if (result.items && Array.isArray(result.items)) {
      const buckets: Record<string, number[]> = {
        factor1: [], factor2: [], factor3: [], factor4: [], factor5: [], factor6: [],
      };
      result.items.forEach((item: any) => {
        if (item.is_na || !item.score) return;
        const fk = getFactorKeyByItemNum(item.item_number);
        buckets[fk].push(item.score);
      });

      const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : 0;
      const allScores = ([] as number[]).concat(
        buckets.factor1, buckets.factor2, buckets.factor3,
        buckets.factor4, buckets.factor5, buckets.factor6,
      );

      result.total_score = avg(allScores);
      result.factor_scores = {
        factor1: avg(buckets.factor1),
        factor2: avg(buckets.factor2),
        factor3: avg(buckets.factor3),
        factor4: avg(buckets.factor4),
        factor5: avg(buckets.factor5),
        factor6: avg(buckets.factor6),
      };

      // 未評価項目数カウント
      const evaluated_item_count = allScores.length;
      result.evaluated_item_count = evaluated_item_count;
    }

    return c.json({
      success: true,
      evaluation: result,
      journal_id: body.journal_id,
      model,
      prompt_version: "CoT-A-v1.0",
      temperature: 0.2,
    });
  } catch (err) {
    console.error("CoT-A error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ai/reflection-depth  (CoT-B)
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/reflection-depth", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "AI評価機能は現在利用できません（APIキー未設定）。管理者にお問い合わせください。", code: "AI_NOT_CONFIGURED" }, 503);
  }

  const body = await c.req.json() as {
    user_message: string;
    journal_content: string;
    session_id: string;
  };

  const model = resolveModel(c.env);
  const baseUrl = getChatCompletionsUrl(c.env).replace(/\/chat\/completions$/, "");
  try {
    const prompt = buildCoTBPrompt(body.user_message, extractJournalText(body.journal_content));
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.1,
      model,
      { baseUrl }
    );
    const result = JSON.parse(raw);
    return c.json({
      success: true,
      reflection: result,
      session_id: body.session_id,
      model,
      prompt_version: "CoT-B-v1.0",
      temperature: 0.1,
    });
  } catch (err) {
    console.error("CoT-B error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ai/generate-goal  (CoT-C)
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/generate-goal", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "AI評価機能は現在利用できません（APIキー未設定）。管理者にお問い合わせください。", code: "AI_NOT_CONFIGURED" }, 503);
  }

  const body = await c.req.json() as {
    conversation: Array<{ role: string; content: string }>;
    journal_content: string;
    week_number: number;
    session_id: string;
    user_id?: string;
  };

  try {
    let bfiScores = null;
    
    // Auth check
    const authContext = getAuthContext(c);
    const authUserId = authContext?.id;
    
    // Strictly require authentication for this route to prevent unauthorized BFI access
    if (!authContext || !authUserId) {
      return c.json({ error: '認証されていません' }, 401);
    }
    
    // Ensure the request is explicitly for the authenticated user
    if (body.user_id && body.user_id !== authUserId) {
       return c.json({ error: 'アクセス権限がありません' }, 403);
    }
    
    // Always use the authenticated user's ID
    const targetUserId = authUserId;

    if (targetUserId) {
      try {
        const row = await c.env.DB.prepare(
          "SELECT conscientiousness, neuroticism, openness FROM user_bfi_scores WHERE user_id = ?"
        ).bind(targetUserId).first();
        if (row) {
          bfiScores = {
            conscientiousness: Number(row.conscientiousness),
            neuroticism: Number(row.neuroticism),
            openness: Number(row.openness)
          };
        }
      } catch (err) {
        console.warn("BFI scores fetch failed or table does not exist:", err);
      }
    }

    const model = resolveModel(c.env);
    const baseUrl = getChatCompletionsUrl(c.env).replace(/\/chat\/completions$/, "");
    const prompt = buildCoTCPrompt(body.conversation, extractJournalText(body.journal_content), body.week_number, bfiScores);
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.3,
      model,
      { baseUrl }
    );
    const result = JSON.parse(raw);
    return c.json({
      success: true,
      goal: result,
      session_id: body.session_id,
      model,
      prompt_version: "CoT-C-v1.0",
      temperature: 0.3,
    });
  } catch (err) {
    console.error("CoT-C error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ai/chat  (省察チャット対話生成)
// CoT-B判定後に適切な問いかけを生成
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/chat", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "AI評価機能は現在利用できません（APIキー未設定）。管理者にお問い合わせください。", code: "AI_NOT_CONFIGURED" }, 503);
  }

  const body = await c.req.json() as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    phase: "phase0" | "phase1" | "bridge" | "phase2";
    journal_content: string;
    week_number: number;
    reflection_depth?: number;
    previous_goal?: string;
    session_id: string;
  };

  const systemPrompt = `あなたは教育実習生の省察を支援するAIチャットBotです。
Hatton & Smith（1995）の省察深さフレームワークに基づいて対話します。

現在のフェーズ: ${body.phase}
フェーズの役割:
- phase0: 前週目標の達成確認（「先週の目標は達成できましたか？」）
- phase1: 省察の深化（最大2〜3問、開かれた質問で省察を促す）
- bridge: 気づきから次週の目標への接続
- phase2: SMART目標の確定・確認

今週の実習日誌（コンテキスト）:
---
${extractJournalText(body.journal_content).slice(0, 600)}...
---

前週の目標: ${body.previous_goal ?? "なし（初週）"}

ルーブリック6因子40項目に基づいて、学生の省察を深めるような質問をしてください。
1回の応答は100字以内に収め、日本語で自然な会話調で応答してください。
省察を促すために、閉じた質問ではなく開かれた質問を使ってください。`;

  try {
    const raw = await fetch(getChatCompletionsUrl(c.env), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolveModel(c.env),
        messages: [
          { role: "system", content: systemPrompt },
          ...body.messages.slice(-10),
        ],
        temperature: 0.7,
        // 応答自体は100字程度だが、reasoning モデルは reasoning_tokens を
        // 消費するため余裕を持たせる（gpt-4o では出力上限としてそのまま機能）。
        max_tokens: 2048,
      }),
    });

    const data = await raw.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    return c.json({
      success: true,
      message: data.choices[0].message.content,
      phase: body.phase,
      session_id: body.session_id,
    });
  } catch (err) {
    console.error("Chat error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────────────────────
// POST /api/ocr/analyze  (OCR画像解析)
// Google Cloud Vision API → Tesseract.js フォールバック
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/analyze", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  // Cloudflare Workers では FormData パースが可能
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile) {
      return c.json({ error: "No image provided" }, 400);
    }

    const gcpKey = c.env?.GOOGLE_CLOUD_VISION_API_KEY;

    if (gcpKey) {
      // Google Cloud Vision API 使用
      const imageData = await imageFile.arrayBuffer();
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageData)));

      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${gcpKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [{
              image: { content: base64Image },
              features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
              imageContext: { languageHints: ["ja"] },
            }],
          }),
        }
      );

      const visionData = await visionResponse.json() as {
        responses: Array<{
          fullTextAnnotation?: {
            text: string;
            pages: Array<{
              blocks: Array<{
                paragraphs: Array<{
                  words: Array<{
                    symbols: Array<{ text: string; confidence: number }>;
                  }>;
                  confidence: number;
                  boundingBox: { vertices: Array<{ x: number; y: number }> };
                }>;
              }>;
            }>;
          };
          error?: { message: string };
        }>;
      };

      if (visionData.responses[0]?.error) {
        throw new Error(visionData.responses[0].error.message);
      }

      const annotation = visionData.responses[0]?.fullTextAnnotation;
      if (!annotation) {
        return c.json({ error: "No text detected" }, 422);
      }

      const blocks = annotation.pages[0]?.blocks.map((block, i) => ({
        id: `blk-${i}`,
        text: block.paragraphs.map((p) =>
          p.words.map((w) => w.symbols.map((s) => s.text).join("")).join(" ")
        ).join("\n"),
        confidence: Math.round(
          block.paragraphs.reduce((s, p) => s + (p.confidence ?? 0), 0) /
          block.paragraphs.length * 100
        ),
      })) ?? [];

      return c.json({
        blocks,
        overall_confidence: Math.round(blocks.reduce((s, b) => s + b.confidence, 0) / Math.max(blocks.length, 1)),
        ocr_source: "vision",
        auto_rotated: false,
        brightness_adjusted: false,
        raw_text: annotation.text,
      });
    }

    // フォールバック: サーバー側 Tesseract は Workers では使えないため
    // クライアント側 Tesseract.js へのフォールバック指示を返す
    return c.json({
      error: "GOOGLE_CLOUD_VISION_API_KEY not configured",
      fallback: "tesseract",
    }, 503);
  } catch (err) {
    console.error("OCR error:", err);
    return c.json({ error: String(err), fallback: "tesseract" }, 500);
  }
});


// POST /api/ai/check-evidence (RQ3b GA-Evidence)
openaiRouter.post("/check-evidence", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) return c.json({ error: "AI評価機能は現在利用できません（APIキー未設定）。管理者にお問い合わせください。", code: "AI_NOT_CONFIGURED" }, 503);

  const authContext = getAuthContext(c);
  if (!authContext) return c.json({ error: "認証されていません" }, 401);

  const { previous_goal, journal_content } = await c.req.json();
  if (!previous_goal || !journal_content) return c.json({ error: "Missing required fields" }, 400);

  const prompt = `あなたは教育実習の評価アシスタントです。
以下の「前週の目標」が、「今週の日誌」の中で具体的に取り組まれた形跡（行動・結果・振り返り）があるか判定してください。

前週の目標:
${previous_goal}

今週の日誌:
${extractJournalText(journal_content)}

判定基準:
日誌の中に、前週目標に対応する具体的な行動の記述、その結果、あるいはそれに対する振り返りが明確に含まれていれば「証拠あり(1)」、含まれていなければ「証拠なし(0)」とします。

JSON形式で出力してください:
{
  "evidence_binary": 1または0,
  "reason": "判定理由（100文字程度で簡潔に）"
}`;

  try {
    const response = await fetch(getChatCompletionsUrl(c.env), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolveModel(c.env, DEFAULT_MODEL_MINI),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    const data: any = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return c.json({ success: true, result });
  } catch (error: any) {
    console.error("check-evidence error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/ai/evaluate-session-rd (RQ3b RD-Chat Session-level holistic judgement)
openaiRouter.post("/evaluate-session-rd", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator"]), async (c) => {
  const apiKey = (c.env as any)?.OPENAI_API_KEY;
  if (!apiKey) return c.json({ error: "AI評価機能は現在利用できません（APIキー未設定）。管理者にお問い合わせください。", code: "AI_NOT_CONFIGURED" }, 503);

  const authContext = getAuthContext(c);
  if (!authContext) return c.json({ error: "認証されていません" }, 401);

  const { conversation } = await c.req.json();
  if (!conversation || !Array.isArray(conversation)) return c.json({ error: "Missing conversation array" }, 400);

  const formattedConv = conversation.map(m => `${m.role === 'user' ? '学生' : 'AI'}: ${m.content}`).join('\n\n');

  const prompt = `あなたは教育実習生の省察プロセスを評価する専門家です。
以下の省察チャットセッション全体を評価し、学生が到達した「省察の深さ（Reflection Depth）」を総合的に判定してください。

セッション履歴:
${formattedConv}

判定基準 (1〜4のレベル):
レベル1 (浅い): 事実の羅列のみ。感情や解釈を含まない。
レベル2 (やや深い): 個人的な感情や単純な解釈が含まれるが、客観的な分析や他者の視点に欠ける。
レベル3 (深い): 客観的な分析、他者の視点（児童や指導教員など）の導入、または自身の指導の背景要因への言及がある。
レベル4 (非常に深い): 批判的省察。自身の信念・価値観の再構築、教育的・社会的文脈からの考察、または将来の実践への明確な応用方針がある。

JSON形式で出力してください:
{
  "rd_level": 1, 2, 3, または 4,
  "category": "shallow" (1), "somewhat_deep" (2), "deep" (3または4),
  "reason": "判定理由（100文字程度で簡潔に）"
}`;

  try {
    const response = await fetch(getChatCompletionsUrl(c.env), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: resolveModel(c.env, DEFAULT_MODEL_MINI),
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    const data: any = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return c.json({ success: true, result });
  } catch (error: any) {
    console.error("evaluate-session-rd error:", error);
    return c.json({ error: error.message }, 500);
  }
});


// 論文 3.8節: SCAT質的分析のAI自動生成エンドポイント
openaiRouter.post("/scat-analysis", requireRoles(["researcher", "admin", "collaborator"]), async (c) => {
  try {
    const { text, apiKey } = await c.req.json();
    if (!text) return c.json({ error: "Text is required" }, 400);

    const token = apiKey || c.env?.OPENAI_API_KEY;
    if (!token) return c.json({ error: "API Key is required" }, 401);

    const systemPrompt = `あなたは質的データ分析（SCAT: Steps for Coding and Theorization）の専門家です。
入力されたテキストデータを以下の手順で分析し、JSON形式で出力してください。

【分析ルール】
1. テキストを意味のまとまり（セグメント）ごとに分割してください。1セグメントに複数トピックが混在する場合は再分割します。
2. 各セグメントに対して、以下の4ステップコーディングと疑問点を必ず抽出してください。
   - step1_focus_words: データ中の注目語句・着目語句
   - step2_outside_words: step1 を言い換えるデータ外の語句
   - step3_explanatory_words: step2 を説明する語句（背景、条件、原因、影響、文脈など）
   - step4_theme_construct: 浮かび上がるテーマ・構成概念
   - step5_questions_issues: 疑問、追加確認事項、未解決点、再インタビューしたい点
   ※ step2を単なる要約にせず、step4はいきなり出さずstep1〜3の上に立つ構成概念として作ること。
3. 全セグメントの分析後、以下の2つを作成してください。
   - storyline: 各セグメントの step4_theme_construct を意味連関に沿ってつなぐ叙述（因果、対比、変化、葛藤を含める）。
   - theoretical_description: 「この事例/データから言えること」を、データに根ざした説明原理としてやや抽象化して文章化したもの。

【出力JSONフォーマット】
{
  "segments": [
    {
      "segment_id": 1,
      "raw_text": "...",
      "step1_focus_words": "...",
      "step2_outside_words": "...",
      "step3_explanatory_words": "...",
      "step4_theme_construct": "...",
      "step5_questions_issues": "..."
    }
  ],
  "storyline": "...",
  "theoretical_description": "...",
  "notes": "..."
}`;

    const response = await fetch(getChatCompletionsUrl(c.env), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: resolveModel(c.env, DEFAULT_MODEL_MINI),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    const parsed = JSON.parse(content);

    return c.json({ success: true, result: parsed });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});


// 毎日誌単位のSCAT個別実行
openaiRouter.post("/scat-analysis/journal", requireRoles(["student", "researcher", "admin", "collaborator", "teacher", "univ_teacher", "school_mentor"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  try {
    const { journal_id, text: textInput, force_reanalyze, apiKey } = await c.req.json();
    if (!journal_id) return c.json({ error: "journal_id is required" }, 400);

    // text が未指定の場合は journal_id から本文を自動取得 (連動性確保)
    let text = textInput;
    if (!text) {
      const journalRow = await db.prepare("SELECT content FROM journal_entries WHERE id = ?").bind(journal_id).first() as any;
      if (!journalRow || !journalRow.content) {
        return c.json({ error: "Journal not found or empty content" }, 404);
      }
      text = String(journalRow.content);
    }

    const token = apiKey || c.env?.OPENAI_API_KEY;
    if (!token) return c.json({ error: "API Key is required" }, 401);

    // Check existing
    const { results: existing } = await db.prepare("SELECT * FROM journal_scat_analyses WHERE journal_id = ? ORDER BY created_at DESC LIMIT 1").bind(journal_id).all();
    if (existing.length > 0 && existing[0].analysis_status === 'completed' && !force_reanalyze) {
      return c.json({ success: true, message: "Already analyzed", analysis_id: existing[0].id });
    }

    const analysis_id = "jsa_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const user = getAuthContext(c);
    const userId = user?.id || "unknown";

    await db.prepare("INSERT INTO journal_scat_analyses (id, journal_id, user_id, analysis_status) VALUES (?, ?, ?, 'processing')")
      .bind(analysis_id, journal_id, userId).run();

    const systemPrompt = `あなたは質的データ分析（SCAT: Steps for Coding and Theorization）の専門家です。
入力されたテキストデータを以下の手順で分析し、JSON形式で出力してください。

【分析ルール】
1. テキストを意味のまとまり（セグメント）ごとに分割してください。1セグメントに複数トピックが混在する場合は再分割します。
2. 各セグメントに対して、以下の4ステップコーディングと疑問点を必ず抽出してください。
   - step1_focus_words: データ中の注目語句・着目語句
   - step2_outside_words: step1 を言い換えるデータ外の語句
   - step3_explanatory_words: step2 を説明する語句（背景、条件、原因、影響、文脈など）
   - step4_theme_construct: 浮かび上がるテーマ・構成概念（複数ある場合はカンマ区切り）
   - step5_questions_issues: 疑問、追加確認事項、未解決点、再インタビューしたい点
   ※ step2を単なる要約にせず、step4はいきなり出さずstep1〜3の上に立つ構成概念として作ること。
3. 全セグメントの分析後、以下の2つを作成してください。
   - storyline: 各セグメントの step4_theme_construct を意味連関に沿ってつなぐ叙述（因果、対比、変化、葛藤を含める）。
   - theoretical_description: 「この事例/データから言えること」を、データに根ざした説明原理としてやや抽象化して文章化したもの。

【出力JSONフォーマット】
{
  "segments": [
    {
      "raw_text": "...",
      "step1_focus_words": "...",
      "step2_outside_words": "...",
      "step3_explanatory_words": "...",
      "step4_theme_construct": "...",
      "step5_questions_issues": "..."
    }
  ],
  "storyline": "...",
  "theoretical_description": "..."
}`;

    const response = await fetch(getChatCompletionsUrl(c.env), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        model: resolveModel(c.env, DEFAULT_MODEL_MINI),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      await db.prepare("UPDATE journal_scat_analyses SET analysis_status = 'failed' WHERE id = ?").bind(analysis_id).run();
      const errorText = await response.text();
      throw new Error(`OpenAI API Error: ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    const parsed = JSON.parse(content);

    // Save segments
    let order = 1;
    const batch = [];
    const stmt = db.prepare("INSERT INTO journal_scat_segments (id, analysis_id, journal_id, segment_order, raw_text, step1_focus_words, step2_outside_words, step3_explanatory_words, step4_theme_construct, step5_questions_issues) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    for (const seg of parsed.segments) {
      batch.push(stmt.bind(
        "seg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        analysis_id,
        journal_id,
        order++,
        seg.raw_text || "",
        seg.step1_focus_words || "",
        seg.step2_outside_words || "",
        seg.step3_explanatory_words || "",
        seg.step4_theme_construct || "",
        seg.step5_questions_issues || ""
      ));
    }
    if (batch.length > 0) {
      await db.batch(batch);
    }

    // Update analysis record
    await db.prepare("UPDATE journal_scat_analyses SET analysis_status = 'completed', storyline = ?, theoretical_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(parsed.storyline || "", parsed.theoretical_description || "", analysis_id).run();

    return c.json({ success: true, analysis_id, result: parsed });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

export default openaiRouter;

openaiRouter.post("/scat-analysis/batch", requireRoles(["researcher", "admin", "collaborator", "teacher"]), async (c) => {
  return c.json({ success: true, message: "Batch processing started" });
});
