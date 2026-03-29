const fs = require('fs');

let code = fs.readFileSync('src/api/routes/data.ts', 'utf8');

// Ensure import
if (!code.includes('getScopeContext')) {
  code = code.replace('import { requireRoles } from "../middleware/auth";', 'import { requireRoles } from "../middleware/auth";\nimport { getScopeContext, buildScopeFilter, assertCanAccessStudent } from "../middleware/scope";');
}

// GET /journals
// old: 
// const journals = studentId
//   ? db.prepare("SELECT * FROM journal_entries WHERE student_id = ? ORDER BY entry_date DESC LIMIT ?").bind(studentId, limit)
//   : db.prepare("SELECT * FROM journal_entries ORDER BY entry_date DESC LIMIT ?").bind(limit);
const getJournalsRegex = /const journals = studentId\s*\?\s*db\.prepare\("SELECT \* FROM journal_entries WHERE student_id = \? ORDER BY entry_date DESC LIMIT \?"\)\.bind\(studentId, limit\)\s*:\s*db\.prepare\("SELECT \* FROM journal_entries ORDER BY entry_date DESC LIMIT \?"\)\.bind\(limit\);/;

const getJournalsReplace = `const scope = await getScopeContext(c, db);
  const { condition, params: scopeParams } = buildScopeFilter(scope, "student_id");
  let query = "SELECT * FROM journal_entries WHERE " + condition;
  let params = [...scopeParams];
  
  if (studentId) {
    query += " AND student_id = ?";
    params.push(studentId);
  }
  
  query += " ORDER BY entry_date DESC LIMIT ?";
  params.push(limit);
  
  const journals = db.prepare(query).bind(...params);`;

code = code.replace(getJournalsRegex, getJournalsReplace);

// GET /journals/:id
// old:
// const journal = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(c.req.param("id")).first();
// if (!journal) return c.json({ error: "Not found" }, 404);
const getJournalRegex = /const journal = await db\.prepare\("SELECT \* FROM journal_entries WHERE id = \?"\)\.bind\(c\.req\.param\("id"\)\)\.first\(\);\s*if \(!journal\) return c\.json\(\{ error: "Not found" \}, 404\);/;
const getJournalReplace = `const journal = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(c.req.param("id")).first();
  if (!journal) return c.json({ error: "Not found" }, 404);
  
  const scope = await getScopeContext(c, db);
  if (!assertCanAccessStudent(scope, journal.student_id as string)) {
    return c.json({ success: false, error: "forbidden", message: "Out of data scope" }, 403);
  }`;
code = code.replace(getJournalRegex, getJournalReplace);

// POST /journals
// force student_id from JWT
const postJournalRegex = /const body = await c\.req\.json\(\) as any;\s*const id = `journal-\$\{Date\.now\(\)\}`;/;
const postJournalReplace = `const body = await c.req.json() as any;
  const user = c.get("user");
  // Force student_id to be current user if student
  if (user?.role === "student") {
    body.student_id = user.id;
  }
  const id = \`journal-\${Date.now()}\`;`;
code = code.replace(postJournalRegex, postJournalReplace);

// PUT /journals/:id
const putJournalRegex = /const updated = await db\.prepare\("SELECT \* FROM journal_entries WHERE id = \?"\)\.bind\(id\)\.first\(\);/;
const putJournalReplace = `const updated = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(id).first();
  if (updated) {
    const scope = await getScopeContext(c, db);
    if (!assertCanAccessStudent(scope, updated.student_id as string)) {
      return c.json({ success: false, error: "forbidden", message: "Out of data scope" }, 403);
    }
  }`;
code = code.replace(putJournalRegex, putJournalReplace);

// DELETE /journals/:id
const delJournalRegex = /await db\.prepare\("DELETE FROM journal_entries WHERE id = \?"\)\.bind\(id\)\.run\(\);/;
const delJournalReplace = `const target = await db.prepare("SELECT student_id FROM journal_entries WHERE id = ?").bind(id).first();
  if (!target) return c.json({ error: "Not found" }, 404);
  
  const scope = await getScopeContext(c, db);
  if (!assertCanAccessStudent(scope, target.student_id as string)) {
    return c.json({ success: false, error: "forbidden", message: "Out of data scope" }, 403);
  }

  await db.prepare("DELETE FROM journal_entries WHERE id = ?").bind(id).run();`;
code = code.replace(delJournalRegex, delJournalReplace);

fs.writeFileSync('src/api/routes/data.ts', code);
