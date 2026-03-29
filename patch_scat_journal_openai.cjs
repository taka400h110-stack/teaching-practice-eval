const fs = require('fs');
const path = '/home/user/webapp/src/api/routes/openai.ts';
let code = fs.readFileSync(path, 'utf8');

const apiRoutes = `
// 毎日誌単位のSCAT個別実行
openaiRouter.post("/scat-analysis/journal", requireRoles(["researcher", "admin", "collaborator", "board_observer", "teacher"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  try {
    const { journal_id, text, force_reanalyze, apiKey } = await c.req.json();
    if (!journal_id || !text) return c.json({ error: "journal_id and text are required" }, 400);

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

    const systemPrompt = \`あなたは質的データ分析（SCAT: Steps for Coding and Theorization）の専門家です。
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
      await db.prepare("UPDATE journal_scat_analyses SET analysis_status = 'failed' WHERE id = ?").bind(analysis_id).run();
      const errorText = await response.text();
      throw new Error(\`OpenAI API Error: \${errorText}\`);
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
`;

if (!code.includes('/scat-analysis/journal')) {
  code = code.replace(
    'export default openaiRouter;',
    apiRoutes + '\nexport default openaiRouter;'
  );
  fs.writeFileSync(path, code);
  console.log('openaiRouter patched.');
} else {
  console.log('Already patched.');
}
