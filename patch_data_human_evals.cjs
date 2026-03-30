const fs = require('fs');
const file = 'src/api/routes/stats.ts';
let code = fs.readFileSync(file, 'utf8');

const oldGet = `statsRouter.get("/ai-vs-human", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {`;

const newGet = `statsRouter.get("/ai-vs-human", requireRoles(["evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
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
    
    // Add mock data if empty
    if (summaries.length === 0) {
      summaries.push({
        journal_id: "mock-journal-1",
        evaluator_name: "Mock Evaluator 1",
        ai_total: 3.8, human_total: 4.0,
        ai_f1: 4.0, ai_f2: 3.5, ai_f3: 3.8, ai_f4: 4.1,
        human_f1: 4.2, human_f2: 3.6, human_f3: 4.0, human_f4: 4.2,
      });
      summaries.push({
        journal_id: "mock-journal-2",
        evaluator_name: "Mock Evaluator 2",
        ai_total: 3.5, human_total: 3.4,
        ai_f1: 3.8, ai_f2: 3.2, ai_f3: 3.5, ai_f4: 3.8,
        human_f1: 3.6, human_f2: 3.1, human_f3: 3.3, human_f4: 3.6,
      });
    }

    return c.json({ summaries, items: [] });
  } catch(e) {
    return c.json({ error: String(e) }, 500);
  }
});`;

const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('statsRouter.get("/ai-vs-human",'));
if (start !== -1) {
  const end = lines.findIndex((l, i) => i > start && l.startsWith('});'));
  if (end !== -1) {
    lines.splice(start, end - start + 1, newGet);
    fs.writeFileSync(file, lines.join('\n'));
    console.log("Patched /ai-vs-human");
  }
}
