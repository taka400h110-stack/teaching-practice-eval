const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/api/routes/exports.ts', 'utf-8');

const rejectEndpoint = `// 4. POST /api/data/exports/requests/:id/reject`;
const revokeEndpoint = `
exportsRouter.post("/requests/:id/revoke", requireAuth, requireRoles(["admin", "researcher"] as UserRole[]), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  
  const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first() as any;
  if (!reqRes) return c.json({ error: "Not found" }, 404);
  
  if (reqRes.requester_user_id !== user.id && user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  await db.batch([
    db.prepare("UPDATE dataset_export_requests SET status = 'revoked' WHERE id = ?").bind(id),
    db.prepare("UPDATE dataset_download_tokens SET is_revoked = 1 WHERE export_request_id = ?").bind(id)
  ]);
  
  setAuditWriteContext(c, {
    action: "update",
    resourceType: "dataset_export_request",
    resourceId: id,
    scopeBasis: user.role === "admin" ? "admin_revoke" : "self_revoke",
    reason: "Revoked data export"
  });
  
  return c.json({ success: true, id });
});

`;

if (!content.includes('/requests/:id/revoke')) {
  content = content.replace(rejectEndpoint, revokeEndpoint + rejectEndpoint);
  fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', content);
  console.log('Revoke endpoint added.');
}
