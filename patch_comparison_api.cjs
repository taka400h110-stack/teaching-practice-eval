const fs = require('fs');

let content = fs.readFileSync('src/api/routes/stats.ts', 'utf8');

const apiCode = `
statsRouter.get("/ai-vs-human", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    // Join evaluations and human_evaluations
    const { results } = await db.prepare(\`
      SELECT 
        e.journal_id,
        e.total_score as ai_total,
        e.factor1 as ai_f1, e.factor2 as ai_f2, e.factor3 as ai_f3, e.factor4 as ai_f4,
        he.evaluator_id,
        he.evaluator_name,
        AVG(he.factor1_score) as human_f1,
        AVG(he.factor2_score) as human_f2,
        AVG(he.factor3_score) as human_f3,
        AVG(he.factor4_score) as human_f4,
        AVG(he.total_score) as human_total
      FROM evaluations e
      JOIN human_evaluations he ON e.journal_id = he.journal_id
      GROUP BY e.journal_id, he.evaluator_id
    \`).all();
    
    return c.json({ success: true, data: results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
`;

if (!content.includes('/ai-vs-human')) {
  content = content.replace('export default statsRouter;', apiCode + '\nexport default statsRouter;');
  fs.writeFileSync('src/api/routes/stats.ts', content);
  console.log("Added /ai-vs-human to stats.ts");
}
