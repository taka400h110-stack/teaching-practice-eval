const fs = require('fs');
const file = 'src/api/routes/data.ts';
let code = fs.readFileSync(file, 'utf8');

const routeToAdd = `
dataRouter.post("/evaluations", requireRoles(["student", "evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const body = await c.req.json() as any;

  try {
    const scores = { f1: [] as number[], f2: [] as number[], f3: [] as number[], f4: [] as number[] };
    body.evaluation.items.forEach((item: any) => {
      if (item.is_na || !item.score) return;
      if (item.item_number <= 7) scores.f1.push(item.score);
      else if (item.item_number <= 13) scores.f2.push(item.score);
      else if (item.item_number <= 17) scores.f3.push(item.score);
      else scores.f4.push(item.score);
    });

    const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100 : null;
    const allScores = [...scores.f1, ...scores.f2, ...scores.f3, ...scores.f4];
    
    const computedTotal = avg(allScores);
    const evalId = genId();
    
    await db.prepare(\`
      INSERT INTO evaluations (id, journal_id, eval_type, model_name, prompt_version, temperature,
        total_score, factor1_score, factor2_score, factor3_score, factor4_score,
        overall_comment, reasoning, halo_effect_detected, token_count, duration_ms, created_at)
      VALUES (?, ?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    \`).bind(
      evalId, body.journal_id,
      body.model_name ?? "gpt-4o",
      body.prompt_version ?? "CoT-A-v1.0",
      body.temperature ?? 0.2,
      computedTotal,
      avg(scores.f1), avg(scores.f2), avg(scores.f3), avg(scores.f4),
      body.evaluation.overall_comment,
      body.evaluation.reasoning,
      body.evaluation.halo_effect_detected ? 1 : 0,
      body.token_count ?? null,
      body.duration_ms ?? null,
      new Date().toISOString()
    ).run();

    // 23項目を保存
    for (const item of body.evaluation.items) {
      await db.prepare(\`
        INSERT INTO evaluation_items (id, evaluation_id, item_number, score, is_na, evidence, feedback, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      \`).bind(
        genId(), evalId, item.item_number,
        item.score ?? null,
        item.is_na ? 1 : 0,
        item.evidence ?? null,
        item.feedback ?? null,
        new Date().toISOString()
      ).run();
    }

    // Update journal status to evaluated
    await db.prepare("UPDATE journal_entries SET status = 'evaluated' WHERE id = ?").bind(body.journal_id).run();

    return c.json({ success: true, evaluation_id: evalId });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
`;

if (!code.includes('dataRouter.post("/evaluations"')) {
  code = code.replace(
    'dataRouter.get("/evaluations",',
    routeToAdd + '\\n\\ndataRouter.get("/evaluations",'
  );
  fs.writeFileSync(file, code, 'utf8');
  console.log('Added POST /evaluations route');
} else {
  console.log('POST /evaluations route already exists');
}
