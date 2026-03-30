const fs = require('fs');

const dataTsPath = 'src/api/routes/data.ts';
let code = fs.readFileSync(dataTsPath, 'utf8');

const postEvalsCode = `
dataRouter.post("/evaluations", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  const body = await c.req.json();
  const { journal_id, evaluation, model_name, prompt_version, overall_comment, total_score, factor_scores } = body;
  const evalId = crypto.randomUUID();

  try {
    await ensureSchema(db);
    
    // First, insert evaluation
    await db.prepare(\`
      INSERT INTO evaluations (
        id, journal_id, eval_type, model_name, prompt_version,
        total_score, factor1_score, factor2_score, factor3_score, factor4_score,
        overall_comment, reasoning, created_at
      ) VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    \`).bind(
      evalId, journal_id, model_name || 'gpt-4o', prompt_version || '1.0',
      total_score, factor_scores?.factor1 || 0, factor_scores?.factor2 || 0,
      factor_scores?.factor3 || 0, factor_scores?.factor4 || 0,
      overall_comment || evaluation?.overall_comment || '',
      evaluation?.reasoning || ''
    ).run();

    // Next, insert items if any
    if (evaluation && Array.isArray(evaluation.items)) {
      const stmt = db.prepare(\`
        INSERT INTO evaluation_items (
          id, evaluation_id, item_number, score, rd_level, is_na, evidence, feedback, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      \`);
      const batch = evaluation.items.map((it) => 
        stmt.bind(
          crypto.randomUUID(),
          evalId,
          it.item_number,
          it.score,
          it.rd_level || '',
          it.is_na ? 1 : 0,
          it.evidence || '',
          it.feedback || ''
        )
      );
      await db.batch(batch);
    }
    
    // Update journal status to evaluated
    await db.prepare("UPDATE journal_entries SET status = 'evaluated' WHERE id = ?").bind(journal_id).run();

    return c.json({ success: true, id: evalId });
  } catch (err) {
    console.error("EVALUATIONS POST ERROR", err);
    return c.json({ error: String(err) }, 500);
  }
});
`;

code = code.replace(
  'dataRouter.get("/evaluations"',
  postEvalsCode + '\ndataRouter.get("/evaluations"'
);

fs.writeFileSync(dataTsPath, code);
console.log("Patched data.ts with POST /evaluations");
