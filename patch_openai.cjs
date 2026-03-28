const fs = require('fs');
const path = '/home/user/webapp/src/api/routes/openai.ts';
let code = fs.readFileSync(path, 'utf8');

const scatRoute = `
// 論文 3.8節: SCAT質的分析のAI自動生成エンドポイント
openaiRouter.post("/scat-analysis", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  try {
    const { text, apiKey } = await c.req.json();
    if (!text) return c.json({ error: "Text is required" }, 400);

    const token = apiKey || c.env?.OPENAI_API_KEY;
    if (!token) return c.json({ error: "API Key is required" }, 401);

    const systemPrompt = \`あなたは質的データ分析（SCAT: Steps for Coding and Theorization）の専門家です。
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
}\`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": \`Bearer \${token}\`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      throw new Error(\`OpenAI API Error: \${errorText}\`);
    }

    const result = await response.json();
    const content = result.choices[0].message.content;
    const parsed = JSON.parse(content);

    return c.json({ success: true, result: parsed });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});
`;

if (!code.includes('/scat-analysis')) {
  code = code.replace('export default openaiRouter;', scatRoute + '\nexport default openaiRouter;');
  fs.writeFileSync(path, code);
  console.log('SCAT route added.');
} else {
  console.log('SCAT route already exists.');
}
