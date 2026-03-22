const fs = require('fs');
const file = 'src/api/routes/data.ts';
let code = fs.readFileSync(file, 'utf8');

// Add evaluator_profiles to schema
const schemaInjection = `
    CREATE TABLE IF NOT EXISTS evaluator_profiles (
      evaluator_id TEXT PRIMARY KEY,
      years_of_experience INTEGER,
      training_background TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`;

code = code.replace('CREATE TABLE IF NOT EXISTS journal_entries', schemaInjection.trim() + '\n    CREATE TABLE IF NOT EXISTS journal_entries');

// Add endpoints
const endpoints = `
// --- Evaluator Profiles ---
dataRouter.get('/evaluator-profiles', async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  await ensureSchema(db);
  try {
    const { results } = await db.prepare("SELECT * FROM evaluator_profiles").all();
    return c.json({ success: true, profiles: results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

dataRouter.post('/evaluator-profiles', async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  await ensureSchema(db);
  const body = await c.req.json();
  try {
    await db.prepare(\`
      INSERT INTO evaluator_profiles (evaluator_id, years_of_experience, training_background)
      VALUES (?, ?, ?)
      ON CONFLICT(evaluator_id) DO UPDATE SET
        years_of_experience = excluded.years_of_experience,
        training_background = excluded.training_background
    \`).bind(body.evaluator_id, body.years_of_experience || 0, body.training_background || "").run();
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// --- Joint Display View ---
dataRouter.get('/joint-display', async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  // Basic Auth Check
  const role = c.req.header("X-User-Role");
  if (role !== "researcher" && role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await ensureSchema(db);
  try {
    const { results } = await db.prepare(\`
      SELECT
        sc.segment_id, sc.researcher_id,
        sc.step1_keywords, sc.step2_thesaurus, sc.step3_concept, sc.step4_theme, sc.memo, sc.factor,
        ss.text_content,
        je.student_id, je.week_number, je.id as journal_id,
        e.total_score as ai_total_score,
        e.factor1_score as ai_f1, e.factor2_score as ai_f2, e.factor3_score as ai_f3, e.factor4_score as ai_f4,
        se.total_score as self_total_score,
        se.factor1_score as self_f1, se.factor2_score as self_f2, se.factor3_score as self_f3, se.factor4_score as self_f4
      FROM scat_codes sc
      JOIN scat_segments ss ON sc.segment_id = ss.id
      LEFT JOIN journal_entries je ON ss.source_journal_id = je.id
      LEFT JOIN evaluations e ON je.id = e.journal_id
      LEFT JOIN self_evaluations se ON je.student_id = se.student_id AND je.week_number = se.week_number
      ORDER BY je.student_id, je.week_number, ss.segment_order
    \`).all();
    return c.json({ success: true, jointData: results });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});
`;

// Add auth check to exports
code = code.replace(
  'dataRouter.get("/export/joint-display-csv", async (c) => {',
  'dataRouter.get("/export/joint-display-csv", async (c) => {\n  const role = c.req.header("X-User-Role");\n  if (role !== "researcher" && role !== "admin") return c.text("Forbidden", 403);\n'
);
code = code.replace(
  'dataRouter.get("/export/chat-goals-csv", async (c) => {',
  'dataRouter.get("/export/chat-goals-csv", async (c) => {\n  const role = c.req.header("X-User-Role");\n  if (role !== "researcher" && role !== "admin") return c.text("Forbidden", 403);\n'
);

code = code.replace('export default dataRouter;', endpoints + '\nexport default dataRouter;');
fs.writeFileSync(file, code);
