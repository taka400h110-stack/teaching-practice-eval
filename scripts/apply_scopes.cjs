const fs = require('fs');

let code = fs.readFileSync('/home/user/webapp/src/api/routes/data.ts', 'utf8');

// replace the journals endpoint
code = code.replace(/dataRouter\.get\("\/journals"[\s\S]*?catch \(err\)/, 
`dataRouter.get("/journals", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  await ensureSchema(db);
  const studentId = c.req.query("student_id");
  const limit = parseInt(c.req.query("limit") ?? "50");

  try {
    const scope = await getScopeContext(c, db);
    const { condition, params } = buildScopeFilter(scope, "student_id");
    
    let query;
    if (studentId) {
      if (!assertCanAccessStudent(scope, studentId)) {
        return c.json({ success: false, error: "forbidden", message: "You do not have permission to access this student's data." }, 403);
      }
      query = db.prepare("SELECT * FROM journal_entries WHERE student_id = ? ORDER BY entry_date DESC LIMIT ?").bind(studentId, limit);
    } else {
      query = db.prepare(\`SELECT * FROM journal_entries WHERE \${condition} ORDER BY entry_date DESC LIMIT ?\`).bind(...params, limit);
    }

    const { results } = await query.all();
    return c.json({ success: true, journals: results, count: results.length });
  } catch (err)`);

// apply to GET /journals/:id
code = code.replace(/dataRouter\.get\("\/journals\/:id"[\s\S]*?catch \(err\)/,
`dataRouter.get("/journals/:id", requireRoles(["student", "teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer", "evaluator"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const journalId = c.req.param("id");

  try {
    const { results } = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(journalId).all();
    if (!results || results.length === 0) {
      return c.json({ success: false, error: "Not found" }, 404);
    }
    
    const journal = results[0] as any;
    const scope = await getScopeContext(c, db);
    if (!assertCanAccessStudent(scope, journal.student_id)) {
      return c.json({ success: false, error: "forbidden", message: "You do not have permission to access this journal." }, 403);
    }
    
    return c.json({ success: true, journal });
  } catch (err)`);

// POST /journals
code = code.replace(/dataRouter\.post\("\/journals"[\s\S]*?catch \(err\)/,
`dataRouter.post("/journals", requireRoles(["student"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const body = await c.req.json();
    const user = c.get("user");
    const studentId = user.id; // Override with user id to prevent spoofing
    
    const id = body.id || crypto.randomUUID();
    await ensureSchema(db);

    const result = await db.prepare(\`
      INSERT INTO journal_entries (id, student_id, entry_date, week_number, content, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    \`).bind(id, studentId, body.entry_date || new Date().toISOString(), body.week_number || 1, body.content || "", JSON.stringify(body.tags || [])).run();

    return c.json({ success: result.success, id });
  } catch (err)`);

// students
code = code.replace(/dataRouter\.get\("\/students"[\s\S]*?catch \(err\)/,
`dataRouter.get("/students", requireRoles(["teacher", "univ_teacher", "school_mentor", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const scope = await getScopeContext(c, db);
    const { condition, params } = buildScopeFilter(scope, "id");
    
    const { results } = await db.prepare(\`SELECT * FROM users WHERE role = 'student' AND \${condition} ORDER BY created_at DESC\`).bind(...params).all();
    return c.json({ success: true, students: results });
  } catch (err)`);

// evaluations
code = code.replace(/dataRouter\.get\("\/evaluations"[\s\S]*?catch \(err\)/,
`dataRouter.get("/evaluations", requireRoles(["teacher", "univ_teacher", "school_mentor", "evaluator", "researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const studentId = c.req.query("student_id");
  const journalId = c.req.query("journal_id");

  try {
    const scope = await getScopeContext(c, db);
    const { condition, params } = buildScopeFilter(scope, "student_id");
    
    let query;
    if (journalId) {
      // Need to join journal to get student_id or assume evaluation has it
      query = db.prepare(\`SELECT * FROM evaluations WHERE journal_id = ? AND \${condition} ORDER BY evaluated_at DESC\`).bind(journalId, ...params);
    } else if (studentId) {
      if (!assertCanAccessStudent(scope, studentId)) {
        return c.json({ success: false, error: "forbidden" }, 403);
      }
      query = db.prepare("SELECT * FROM evaluations WHERE student_id = ? ORDER BY evaluated_at DESC").bind(studentId);
    } else {
      query = db.prepare(\`SELECT * FROM evaluations WHERE \${condition} ORDER BY evaluated_at DESC\`).bind(...params);
    }

    const { results } = await query.all();
    return c.json({ success: true, evaluations: results });
  } catch (err)`);

fs.writeFileSync('/home/user/webapp/src/api/routes/data.ts', code);
console.log('updated data.ts scopes');
