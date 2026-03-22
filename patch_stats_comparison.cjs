const fs = require('fs');

let content = fs.readFileSync('src/api/routes/stats.ts', 'utf8');

const apiCode = `
statsRouter.get("/ai-vs-human", async (c) => {
  const role = c.req.header("X-User-Role");
  if (role !== "researcher" && role !== "admin") return c.text("Forbidden", 403);

  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const { results: summaries } = await db.prepare(\`
      SELECT 
        e.journal_id,
        e.total_score as ai_total,
        e.factor1 as ai_f1, e.factor2 as ai_f2, e.factor3 as ai_f3, e.factor4 as ai_f4,
        he.evaluator_id,
        he.evaluator_name,
        he.factor1_score as human_f1,
        he.factor2_score as human_f2,
        he.factor3_score as human_f3,
        he.factor4_score as human_f4,
        he.total_score as human_total
      FROM evaluations e
      JOIN human_evaluations he ON e.journal_id = he.journal_id
    \`).all();
    
    // Also fetch items
    const { results: items } = await db.prepare(\`
      SELECT 
        ei.journal_id,
        ei.item_number,
        ei.score as ai_score,
        hei.score as human_score,
        hei.evaluator_id
      FROM evaluation_items ei
      JOIN human_eval_items hei ON ei.journal_id = hei.journal_id AND ei.item_number = hei.item_number
    \`).all();
    
    return c.json({ success: true, summaries, items });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
`;

content = content.replace(/statsRouter\.get\("\/ai-vs-human", async \(c\) => \{[\s\S]*?\}\);\n/s, '');
content = content.replace('export default statsRouter;', apiCode + '\nexport default statsRouter;');
fs.writeFileSync('src/api/routes/stats.ts', content);
console.log("Updated /ai-vs-human API");
