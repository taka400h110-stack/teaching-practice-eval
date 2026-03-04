/**
 * src/api/routes/openai.ts
 * Hono APIルート: OpenAI GPT-4 CoT-A / CoT-B / CoT-C
 * 論文第4章 4.4節: AI評価エンジン（CoT-A）
 *            4.6節: 省察チャットBot（CoT-B / CoT-C）
 *
 * CoT-A temperature=0.2 → 23項目×5段階ルーブリック評価
 * CoT-B temperature=0.1 → Hatton & Smith 4レベル省察深さ判定
 * CoT-C temperature=0.3 → Locke & Latham SMART目標提案
 *
 * 環境変数: OPENAI_API_KEY
 */
import { Hono } from "hono";
import { cors } from "hono/cors";

const openaiRouter = new Hono<{ Bindings: CloudflareBindings }>();
openaiRouter.use("*", cors());

// ────────────────────────────────────────────────────────────────
// CoT-Aプロンプト（AI評価）
// 論文 4.4.2: temperature=0.2、JSON出力
// ────────────────────────────────────────────────────────────────
function buildCoTAPrompt(journalContent: string, studentName: string, weekNumber: number): string {
  return `あなたは教育実習評価の専門家AIです。以下の実習日誌を4因子23項目のルーブリックで評価してください。

## 評価対象
実習生: ${studentName}
第${weekNumber}週 実習日誌:
---
${journalContent}
---

## ルーブリック（4因子23項目・5段階評価）

### 因子Ⅰ 児童生徒への指導力（項目1-7）
1. 特別な支援を必要とする児童（身体障害を有する者を含む）に対して、見通しをもって適切な対応ができること
2. 自国の言語が母語でない児童に対して、適切な対応や指導ができること
3. 特別な支援を必要とする児童に対して、どのような対応をすればよいかを理解していること
4. 自国の言語が母語でない児童に対して、どのような対応をすればよいかを理解していること
5. 児童の「性別」による心理・行動の違いの重要性を正しく理解していること
6. 児童の発達と健康は、様々な社会的、宗教的、民族的、文化的、言語的影響を受けることを理解していること
7. 各教科等の特性を踏まえ、児童の実態に即した授業づくりができること

### 因子Ⅱ 自己評価力（項目8-13）
8. 実習生の体験から得た知識が、教師の仕事や教師としての発達にいかに関係するかを理解できること
9. 授業と学習に関して語り、教育活動の発展に関する興味と関心を示し、自分自身の指導や姿勢を検証する能力を備えていること
10. 児童に対して期待している肯定的な価値観、態度、および行動を実践して見せること
11. アドバイスとフィードバックに基づき行動し、指導と助言を受け入れること
12. 自分自身の実践を反省し、改善し、専門的ニーズの発達を認識し、それを実現することに責任を持つこと
13. 教師としての専門性を向上させるために反省、自己省察することも含めて、自分自身を評価する力を有すること

### 因子Ⅲ 学級経営力（項目14-17）
14. クラス運営に伴う生徒指導に関する力を有すること
15. クラス運営に伴う管理能力を有すること
16. 権威ある存在として教室内でクラス運営に伴うリーダーシップを発揮することができること
17. 学校や授業における児童の困難や葛藤の解決を支援することができること

### 因子Ⅳ 職務を理解して行動する力（項目18-23）
18. 共に働いている同僚が、学習のサポートに適切に参加し、彼らが果たすことを期待されている役割を理解していること
19. 特別な責任を有する同僚の役割を知ること
20. 教師の仕事に関連する人間関係及び専門的な面においての期待を分析し対応すること
21. 教師の役割を遂行するための多様な方法を知り、その根拠を理解すること
22. 授業とクラスの社会生活における教師の権威の意味について理解すること
23. 職業の方針と実践に留意し、その実践においては連帯責任を有すること

## 評価スコア基準（5段階）
1 = 当該側面への記述・省察が日誌に見られない（RD0）
2 = 記述的書き込み：出来事・事実の列挙にとどまる（RD1）
3 = 記述的省察：感情・気づきを言語化するが分析は限定的（RD2）
4 = 対話的省察：原因・背景を多角的に分析し、代替案を検討（RD3）
5 = 批判的省察：教育的信念・社会的文脈と実践を結びつける（RD4）
N/A = 日誌に記述がなく判断不能

## 出力形式（厳密にJSONで出力）
{
  "reasoning": "Chain-of-Thoughtの推論過程（3-5文）",
  "items": [
    {
      "item_number": 1,
      "score": 3,
      "evidence": "日誌から引用した根拠テキスト（30字以内）",
      "feedback": "具体的な改善フィードバック（50字以内）",
      "is_na": false
    },
    ...全23項目...
  ],
  "factor_scores": {
    "factor1": 2.8,
    "factor2": 3.2,
    "factor3": 2.5,
    "factor4": 3.0
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
  weekNumber: number
): string {
  const convText = conversation.slice(-6).map((m) => `${m.role === "user" ? "学生" : "AI"}: ${m.content}`).join("\n");
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
因子Ⅰ: 児童生徒への指導力（項目1-7）
因子Ⅱ: 自己評価力（項目8-13）
因子Ⅲ: 学級経営力（項目14-17）
因子Ⅳ: 職務を理解して行動する力（項目18-23）

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
  "target_week": ${weekNumber + 1}
}`;
}

// ────────────────────────────────────────────────────────────────
// OpenAI API 呼び出し共通関数
// ────────────────────────────────────────────────────────────────
async function callOpenAI(
  apiKey: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature: number,
  model: string = "gpt-4o"
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  return data.choices[0].message.content;
}

// ────────────────────────────────────────────────────────────────
// POST /api/ai/evaluate  (CoT-A)
// ────────────────────────────────────────────────────────────────
openaiRouter.post("/evaluate", async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const body = await c.req.json() as {
    journal_content: string;
    student_name: string;
    week_number: number;
    journal_id: string;
  };

  try {
    const prompt = buildCoTAPrompt(body.journal_content, body.student_name, body.week_number);
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.2
    );
    const result = JSON.parse(raw);
    return c.json({
      success: true,
      evaluation: result,
      journal_id: body.journal_id,
      model: "gpt-4o",
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
openaiRouter.post("/reflection-depth", async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const body = await c.req.json() as {
    user_message: string;
    journal_content: string;
    session_id: string;
  };

  try {
    const prompt = buildCoTBPrompt(body.user_message, body.journal_content);
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.1
    );
    const result = JSON.parse(raw);
    return c.json({
      success: true,
      reflection: result,
      session_id: body.session_id,
      model: "gpt-4o",
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
openaiRouter.post("/generate-goal", async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
  }

  const body = await c.req.json() as {
    conversation: Array<{ role: string; content: string }>;
    journal_content: string;
    week_number: number;
    session_id: string;
  };

  try {
    const prompt = buildCoTCPrompt(body.conversation, body.journal_content, body.week_number);
    const raw = await callOpenAI(
      apiKey,
      [{ role: "user", content: prompt }],
      0.3
    );
    const result = JSON.parse(raw);
    return c.json({
      success: true,
      goal: result,
      session_id: body.session_id,
      model: "gpt-4o",
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
openaiRouter.post("/chat", async (c) => {
  const apiKey = c.env?.OPENAI_API_KEY;
  if (!apiKey) {
    return c.json({ error: "OPENAI_API_KEY not configured" }, 500);
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
${body.journal_content.slice(0, 600)}...
---

前週の目標: ${body.previous_goal ?? "なし（初週）"}

ルーブリック4因子23項目に基づいて、学生の省察を深めるような質問をしてください。
1回の応答は100字以内に収め、日本語で自然な会話調で応答してください。
省察を促すために、閉じた質問ではなく開かれた質問を使ってください。`;

  try {
    const raw = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...body.messages.slice(-10),
        ],
        temperature: 0.7,
        max_tokens: 300,
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
openaiRouter.post("/ocr", async (c) => {
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

export default openaiRouter;
