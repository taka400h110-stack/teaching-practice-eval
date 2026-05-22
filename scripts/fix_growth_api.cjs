const fs = require('fs');

const file = '/home/user/webapp/src/api/routes/data.ts';
let code = fs.readFileSync(file, 'utf8');

const newRoute = `
dataRouter.get("/growth/:studentId", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const studentId = c.req.param("studentId");

  try {
    const { results } = await db.prepare(\`
      SELECT 
        j.week_number,
        AVG(e.factor1_score) as factor1,
        AVG(e.factor2_score) as factor2,
        AVG(e.factor3_score) as factor3,
        AVG(e.factor4_score) as factor4,
        AVG(e.total_score) as total,
        AVG(e.total_score) as ai_total,
        MAX(j.id) as journal_id
      FROM journal_entries j
      JOIN evaluations e ON j.id = e.journal_id
      WHERE j.student_id = ?
      GROUP BY j.week_number
      ORDER BY j.week_number ASC
    \`).bind(studentId).all();

    return c.json({
      success: true,
      student_id: studentId,
      weekly_scores: results.map((row) => ({
        week_number: row.week_number,
        factor1: row.factor1 || 0,
        factor2: row.factor2 || 0,
        factor3: row.factor3 || 0,
        factor4: row.factor4 || 0,
        total: row.total || 0,
        ai_total: row.ai_total || 0,
        journal_id: row.journal_id || ""
      }))
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

`;

// insert before dataRouter.get("/self-evals/:studentId"
code = code.replace(
  'dataRouter.get("/self-evals/:studentId"',
  newRoute + 'dataRouter.get("/self-evals/:studentId"'
);

fs.writeFileSync(file, code);
console.log('Added /growth/:studentId route.');
