const fs = require('fs');
const path = './src/api/routes/stats.ts';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('/ai-vs-human')) {
  const patch = `
// AI vs Human 比較 (ComparisonPage 用)
statsRouter.get("/ai-vs-human", async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  try {
    const { results: aiEvals } = await db.prepare("SELECT * FROM evaluations").all();
    const { results: humanEvals } = await db.prepare("SELECT * FROM human_evaluations").all();
    
    const summaries = [];
    const aiMap = new Map(aiEvals.map(e => [e.journal_id, e]));
    for (const he of humanEvals) {
      const ae = aiMap.get(he.journal_id);
      if (ae) {
        summaries.push({
          journal_id: he.journal_id,
          evaluator_name: he.evaluator_id,
          ai_total: ae.total_score || 0,
          human_total: he.total_score || 0,
          ai_f1: ae.factor1_score, ai_f2: ae.factor2_score, ai_f3: ae.factor3_score, ai_f4: ae.factor4_score,
          human_f1: he.factor1_score, human_f2: he.factor2_score, human_f3: he.factor3_score, human_f4: he.factor4_score,
        });
      }
    }
    return c.json({ summaries, items: [] });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});
`;
  content = content.replace('export default statsRouter;', patch + '\nexport default statsRouter;');
  fs.writeFileSync(path, content);
  console.log('Patched stats.ts');
} else {
  console.log('Already patched');
}
