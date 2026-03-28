const fs = require('fs');
const path = '/home/user/webapp/src/api/routes/data.ts';
let code = fs.readFileSync(path, 'utf8');

// Update table creation if it hasn't been updated yet
if (!code.includes('storyline TEXT')) {
  code = code.replace(
    'description TEXT,',
    'description TEXT,\n      storyline TEXT,\n      theoretical_description TEXT,'
  );
  
  // Add a route to update storyline
  const updateRoute = `
dataRouter.put("/scat/projects/:projectId/theorization", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  try {
    const { storyline, theoretical_description } = await c.req.json();
    const projectId = c.req.param("projectId");
    
    // Attempt to add columns if they don't exist (SQLite doesn't support ADD COLUMN IF NOT EXISTS easily without PRAGMA, so we catch errors)
    try {
      await db.prepare("ALTER TABLE scat_projects ADD COLUMN storyline TEXT").run();
      await db.prepare("ALTER TABLE scat_projects ADD COLUMN theoretical_description TEXT").run();
    } catch(e) {} // Ignore if already exists

    await db.prepare("UPDATE scat_projects SET storyline = ?, theoretical_description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(storyline || "", theoretical_description || "", projectId).run();
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});
`;
  code = code.replace('dataRouter.get("/scat/segments/:projectId"', updateRoute + '\n\ndataRouter.get("/scat/segments/:projectId"');
  fs.writeFileSync(path, code);
  console.log('scat_projects table updated with theorization columns and route added.');
}
