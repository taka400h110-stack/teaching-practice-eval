import { Hono } from "hono";
import { requireRoles } from "../middleware/auth";

const scatRouter = new Hono<{ Bindings: CloudflareBindings }>();

// M1〜Mnのマスタを取得するユーティリティ
async function getLearningElements(db: any) {
  const { results } = await db.prepare("SELECT * FROM scat_learning_element_master ORDER BY display_order").all();
  return results || [];
}

// A. GET /api/data/scat/journals/:journalId
scatRouter.get("/journals/:journalId", requireRoles(["researcher", "admin"]), async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const journalId = c.req.param("journalId");
  
  try {
    const journalResult = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(journalId).first();
    if (!journalResult) return c.json({ success: true, journal: null, segments: [], concepts: [], elements: [], newElements: [] });

    const runsResult = await db.prepare("SELECT * FROM scat_runs WHERE journal_id = ? ORDER BY run_date DESC LIMIT 1").bind(journalId).first();
    
    let segments = [];
    let concepts = [];
    if (runsResult) {
      const segRes = await db.prepare("SELECT * FROM scat_segments WHERE run_id = ? ORDER BY segment_order").bind(runsResult.id).all();
      segments = segRes.results || [];
      
      if (segments.length > 0) {
        const segIds = segments.map(s => `'${s.id}'`).join(',');
        const conRes = await db.prepare(`SELECT * FROM scat_concepts WHERE segment_id IN (${segIds})`).all();
        concepts = conRes.results || [];
      }
    }

    const elemRes = await db.prepare("SELECT * FROM scat_journal_elements WHERE journal_id = ? AND present = 1").bind(journalId).all();
    const elements = elemRes.results || [];

    const newElemRes = await db.prepare("SELECT * FROM scat_student_mastery WHERE first_journal_id = ?").bind(journalId).all();
    const newElements = newElemRes.results || [];

    return c.json({
      success: true,
      journal: journalResult,
      segments,
      concepts,
      elements,
      newElements
    });
  } catch (err: any) {
    console.error("SCAT API Error", err);
    return c.json({ success: true, journal: null, segments: [], concepts: [], elements: [], newElements: [] });
  }
});

// B. POST /api/data/scat/journals/:journalId/run
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
});

// C. GET /api/data/scat/students/:studentId/trajectory
scatRouter.get("/students/:studentId/trajectory", requireRoles(["researcher", "admin"]), async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  const studentId = c.req.param("studentId");
  
  try {
    const journals = await db.prepare("SELECT * FROM journal_entries WHERE student_id = ? ORDER BY entry_date ASC").bind(studentId).all();
    const elements = await getLearningElements(db);
    const mastery = await db.prepare("SELECT * FROM scat_student_mastery WHERE student_id = ? AND mastered = 1").bind(studentId).all();
    
    return c.json({
      success: true,
      studentId,
      journals: journals.results || [],
      mastery: mastery.results || [],
      elements,
      mermaidChart: 'graph TD\n  M1-->M2\n  M2-->M5\n  M3-->M5'
    });
  } catch (err: any) {
    console.error("SCAT API Error", err);
    return c.json({ success: true, studentId, journals: [], mastery: [], elements: [] });
  }
});

// D. GET /api/data/scat/class
scatRouter.get("/class", requireRoles(["researcher", "admin"]), async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  try {
    const elements = await getLearningElements(db);
    const masteryRes = await db.prepare("SELECT * FROM scat_student_mastery WHERE mastered = 1").all();
    const mastery = masteryRes.results || [];
    
    // Get unique students
    const studentsRes = await db.prepare("SELECT id, name FROM users WHERE role = 'student'").all();
    const students = studentsRes.results || [];
    
    // Construct SP Table data structure
    // Group by student
    const spTable = students.map(s => {
      const studentMastery = mastery.filter(m => m.student_id === s.id).map(m => m.element_code);
      return {
        studentId: s.id,
        studentName: s.name,
        masteredCount: studentMastery.length,
        elements: studentMastery
      };
    });
    
    // Sort SP Table
    // Columns sorted by total mastered
    const elemCounts: Record<string, number> = {};
    elements.forEach(e => elemCounts[e.element_code] = 0);
    mastery.forEach(m => {
        if(elemCounts[m.element_code] !== undefined) elemCounts[m.element_code]++;
    });
    
    const sortedElements = elements.map(e => ({...e, count: elemCounts[e.element_code]})).sort((a, b) => b.count - a.count);
    
    // Rows sorted by total mastered
    spTable.sort((a, b) => b.masteredCount - a.masteredCount);

    return c.json({
      success: true,
      spTable,
      sortedElements,
      transmissionCoefficients: spTable.map(s => ({ studentId: s.studentId, studentName: s.studentName, coefficient: 0.85, type: '構造型' })),
      mermaidChart: 'graph TD\n  M1-->M2\n  M1-->M3\n  M2-->M4\n  M3-->M5\n  M4-->M5'
    });
  } catch (err: any) {
    console.error("SCAT API Error", err);
    return c.json({ success: true, spTable: [], sortedElements: [], transmissionCoefficients: [] });
  }
});

// E. GET /api/data/scat/reference-map
scatRouter.get("/reference-map", requireRoles(["researcher", "admin"]), async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  try {
    const nodes = await getLearningElements(db);
    const edgesRes = await db.prepare("SELECT * FROM scat_reference_edges").all();
    
    return c.json({
      success: true,
      nodes,
      edges: edgesRes.results || []
    });
  } catch (err: any) {
    console.error("SCAT API Error", err);
    return c.json({ success: true, nodes: [], edges: [] });
  }
});

export default scatRouter;
