const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/data.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `dataRouter.put("/journals/:id", requireRoles(["student"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const id = c.req.param("id");
  const body = await c.req.json();
  
  try {
    const fields = Object.keys(body).filter(k => k !== 'id');
    if (fields.length === 0) return c.json({ success: true });
    
    const setClause = fields.map(k => \`\${k} = ?\`).join(", ");
    const values = fields.map(k => body[k]);
    
    await db.prepare(\`UPDATE journal_entries SET \${setClause} WHERE id = ?\`)
      .bind(...values, id)
      .run();
      
    const updated = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(id).first();
  if (updated) {
    const scope = await getScopeContext(c, db);
    if (!assertCanAccessStudent(scope, updated.student_id as string)) {
      return c.json({ success: false, error: "forbidden", message: "Out of data scope" }, 403);
    }
  }
    return c.json(updated);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});`;

const replacement = `dataRouter.put("/journals/:id", requireRoles(["student"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const id = c.req.param("id");
  const body = await c.req.json();
  
  try {
    const beforeState = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(id).first() as any;
    if (!beforeState) return c.json({ error: "Not found" }, 404);
    
    const scope = await getScopeContext(c, db);
    if (!assertCanAccessStudent(scope, beforeState.student_id)) {
      return c.json({ success: false, error: "forbidden", message: "Out of data scope" }, 403);
    }

    const fields = Object.keys(body).filter(k => k !== 'id' && k !== 'student_id');
    if (fields.length === 0) return c.json({ success: true });
    
    const setClause = fields.map(k => \`\${k} = ?\`).join(", ");
    const values = fields.map(k => body[k]);
    
    await db.prepare(\`UPDATE journal_entries SET \${setClause} WHERE id = ?\`)
      .bind(...values, id)
      .run();
      
    const updated = await db.prepare("SELECT * FROM journal_entries WHERE id = ?").bind(id).first() as any;
    
    // Do not log full text content in audit
    const safeBefore = { ...beforeState };
    const safeAfter = { ...updated };
    delete safeBefore.content;
    delete safeAfter.content;

    setAuditWriteContext(c, {
      resourceType: 'journal',
      resourceId: id,
      targetStudentId: updated.student_id,
      entityOwnerUserId: updated.student_id,
      action: 'update',
      scopeBasis: 'self',
      changedFields: fields,
      beforeState: safeBefore,
      afterState: safeAfter,
      changeSummary: { operation: 'update' }
    });

    return c.json(updated);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync(filePath, content);
  console.log("Updated PUT /journals/:id successfully.");
} else {
  console.error("Could not find PUT journals target string in data.ts");
}
