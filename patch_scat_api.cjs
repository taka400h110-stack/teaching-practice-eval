const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/scat.ts', 'utf8');

const postRun = `// B. POST /api/data/scat/journals/:journalId/run
scatRouter.post("/journals/:journalId/run", requireRoles(["researcher", "admin"]), async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const journalId = c.req.param("journalId");
  
  try {
    const journal = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(journalId).first();
    if (!journal) return c.json({ error: "Journal not found" }, 404);
    
    // Simulate LLM extraction & DB update
    const runId = 'run-' + Date.now();
    await db.prepare("INSERT INTO scat_runs (id, journal_id, student_id, run_date, status) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'completed')").bind(runId, journalId, journal.student_id).run();
    
    const elementsRes = await db.prepare("SELECT element_code FROM scat_learning_element_master").all();
    const allElements = elementsRes.results || [];
    const randomElements = allElements.sort(() => 0.5 - Math.random()).slice(0, 3);
    
    for (const el of randomElements) {
        await db.prepare("INSERT OR IGNORE INTO scat_journal_elements (journal_id, element_code, present) VALUES (?, ?, 1)").bind(journalId, el.element_code).run();
        const smId = 'sm-' + journal.student_id + '-' + el.element_code;
        await db.prepare("INSERT OR IGNORE INTO scat_student_mastery (id, student_id, element_code, mastered, first_journal_id, first_week_number) VALUES (?, ?, ?, 1, ?, 1)").bind(smId, journal.student_id, el.element_code, journalId).run();
    }
    
    return c.json({ success: true, message: "Run completed (mocked DB update)" });
  } catch (err: any) {
    console.error("SCAT API Error", err);
    return c.json({ error: String(err) }, 500);
  }
});`;

content = content.replace(/\/\/ B\. POST \/api\/data\/scat\/journals\/:journalId\/run[\s\S]*?\/\/ C\./, postRun + "\n\n// C.");

// Add mock mermaid to C.
content = content.replace(/success: true,\n\s*studentId,\n\s*journals: journals.results \|\| \[\],\n\s*mastery: mastery.results \|\| \[\],\n\s*elements/, `success: true,
      studentId,
      journals: journals.results || [],
      mastery: mastery.results || [],
      elements,
      mermaidChart: 'graph TD\\n  M1-->M2\\n  M2-->M5\\n  M3-->M5'`);

// Add mock mermaid to D.
content = content.replace(/transmissionCoefficients: spTable.map\(s => \(\{ studentId: s.studentId, studentName: s.studentName, coefficient: 0.85, type: '構造型' \}\)\) \/\/ Mock\n\s*\}\);/, `transmissionCoefficients: spTable.map(s => ({ studentId: s.studentId, studentName: s.studentName, coefficient: 0.85, type: '構造型' })),
      mermaidChart: 'graph TD\\n  M1-->M2\\n  M1-->M3\\n  M2-->M4\\n  M3-->M5\\n  M4-->M5'
    });`);

fs.writeFileSync('/home/user/webapp/src/api/routes/scat.ts', content);
console.log("Patched scat.ts");
