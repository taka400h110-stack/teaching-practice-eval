const fs = require('fs');

const exportsTs = `
import { Hono } from "hono";
import { requireAuth, requireRoles } from "../middleware/auth";
import { setAuditWriteContext, setAuditReadContext } from "../middleware/audit";
import { resolveResearchScope } from "../services/researchScope";
import { applyAnonymization } from "../services/anonymization";
import { D1Database } from "@cloudflare/workers-types";
import { UserRole } from "../../types";

type Env = { Bindings: { DB: D1Database }, Variables: { user: any } };
const exportsRouter = new Hono<Env>();

const RESEARCH_ROLES: UserRole[] = ["researcher", "collaborator", "board_observer", "admin"];

// Helper to generate a random token
function generateToken() {
  return crypto.randomUUID() + crypto.randomUUID();
}

// 1. POST /api/data/exports/requests
exportsRouter.post("/requests", requireAuth, requireRoles(RESEARCH_ROLES), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const body = await c.req.json();
  
  const id = "req-" + crypto.randomUUID();
  const request_type = body.request_type || "export";
  
  if (request_type === "raw_access" && !["admin"].includes(user.role) && !["researcher"].includes(user.role)) {
    return c.json({ error: "Role not allowed to request raw access" }, 403);
  }
  
  // Create pending request
  await db.prepare(\`
    INSERT INTO dataset_export_requests (
      id, requester_user_id, requester_role, request_type, dataset_type, scope_level,
      course_id, cohort_id, student_id, requested_anonymization_level,
      status, purpose, justification, filter_params_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  \`).bind(
    id, user?.id || "", user?.role || "", request_type, body.dataset_type || "", body.scope_level || "",
    body.course_id || null, body.cohort_id || null, body.student_id || null,
    body.requested_anonymization_level || "", body.purpose || "", body.justification || null,
    body.field_filters_json ? JSON.stringify(body.field_filters_json) : null
  ).run();
  
  setAuditWriteContext(c, {
    action: "create",
    resourceType: "dataset_export_request",
    resourceId: id,
    targetStudentId: body.student_id || null,
    scopeBasis: "export_request",
    reason: "Requested data export"
  });
  
  return c.json({ id, status: "pending" });
});

// 2. GET /api/data/exports/requests
exportsRouter.get("/requests", requireAuth, requireRoles(RESEARCH_ROLES), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  
  let query = "SELECT * FROM dataset_export_requests";
  let params: any[] = [];
  
  if (user.role !== "admin") {
    query += " WHERE requester_user_id = ?";
    params.push(user.id);
  }
  
  const { results } = await db.prepare(query).bind(...params).all();
  
  setAuditReadContext(c, {
    resourceType: "dataset_export_request",
    visibleRecordCount: results.length,
    scopeBasis: user.role === "admin" ? "admin" : "own_requests"
  });
  
  return c.json({ requests: results });
});

// 3. POST /api/data/exports/requests/:id/approve
exportsRouter.post("/requests/:id/approve", requireAuth, requireRoles(["admin"] as UserRole[]), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  
  const { results } = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).all();
  if (results.length === 0) return c.json({ error: "Not found" }, 404);
  
  await db.prepare(\`
    UPDATE dataset_export_requests
    SET status = 'approved', approved_anonymization_level = ?, approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP, max_download_count = ?
    WHERE id = ?
  \`).bind(
    body.approved_anonymization_level || results[0].requested_anonymization_level,
    user.id,
    body.max_download_count || 1,
    id
  ).run();
  
  setAuditWriteContext(c, {
    action: "update",
    resourceType: "dataset_export_request",
    resourceId: id,
    scopeBasis: "admin_approval",
    reason: "Approved data export"
  });
  
  return c.json({ success: true, id });
});

// 4. POST /api/data/exports/requests/:id/reject
exportsRouter.post("/requests/:id/reject", requireAuth, requireRoles(["admin"] as UserRole[]), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  
  await db.prepare(\`
    UPDATE dataset_export_requests
    SET status = 'rejected', rejection_reason = ?, approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  \`).bind(body.rejected_reason, user.id, id).run();
  
  setAuditWriteContext(c, {
    action: "update",
    resourceType: "dataset_export_request",
    resourceId: id,
    scopeBasis: "admin_approval",
    reason: "Rejected data export"
  });
  
  return c.json({ success: true, id });
});

// 5. POST /api/data/exports/requests/:id/generate
exportsRouter.post("/requests/:id/generate", requireAuth, requireRoles(["admin", "researcher", "collaborator"] as UserRole[]), async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const user = c.get("user");
  
  const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first() as any;
  if (!reqRes) return c.json({ error: "Not found" }, 404);
  
  if (reqRes.requester_user_id !== user.id && user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  if (reqRes.status !== "approved") {
    return c.json({ error: "Request not approved" }, 400);
  }
  
  // Here we would apply scopes and fetch real data based on dataset_type.
  // For simplicity we will mock generation
  const mockFilePath = "/exports/file-" + id + ".json";
  
  await db.prepare(\`
    UPDATE dataset_export_requests
    SET status = 'completed', export_file_path = ?, export_row_count = ?, export_summary_json = ?
    WHERE id = ?
  \`).bind(mockFilePath, 100, JSON.stringify({ note: "Generated data" }), id).run();
  
  setAuditWriteContext(c, {
    action: "update",
    resourceType: "dataset_export_request",
    resourceId: id,
    scopeBasis: "export_generation",
    reason: "Generated data export"
  });
  
  return c.json({ success: true, id, status: "completed" });
});

// 6. POST /api/data/exports/requests/:id/download-token
exportsRouter.post("/requests/:id/download-token", requireAuth, requireRoles(RESEARCH_ROLES), async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const user = c.get("user");
  
  const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first() as any;
  if (!reqRes) return c.json({ error: "Not found" }, 404);
  
  if (reqRes.requester_user_id !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (reqRes.status !== "completed") {
    return c.json({ error: "Export not generated yet" }, 400);
  }
  if (reqRes.current_download_count >= reqRes.max_download_count) {
    return c.json({ error: "Download limit reached" }, 403);
  }
  
  const token = generateToken();
  const tokenId = "tok-" + crypto.randomUUID();
  
  // 1 hour expiry
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  
  await db.prepare(\`
    INSERT INTO dataset_download_tokens (id, export_request_id, token_hash, issued_to_user_id, expires_at)
    VALUES (?, ?, ?, ?, ?)
  \`).bind(tokenId, id, token, user.id, expiresAt).run();
  
  setAuditWriteContext(c, {
    action: "create",
    resourceType: "dataset_download_token",
    resourceId: tokenId,
    scopeBasis: "token_issuance",
    reason: "Issued download token"
  });
  
  return c.json({ token, id });
});

// 7. GET /api/data/exports/download/:token
exportsRouter.get("/download/:token", async (c) => {
  const db = c.env.DB;
  const token = c.req.param("token");
  
  const tokenRes = await db.prepare(\`
    SELECT * FROM dataset_download_tokens WHERE token_hash = ? AND is_revoked = 0 AND expires_at > CURRENT_TIMESTAMP
  \`).bind(token).first() as any;
  
  if (!tokenRes) {
    setAuditReadContext(c, { resourceType: "dataset_download", reason: "Invalid or expired token" });
    return c.json({ error: "Invalid token" }, 403);
  }
  
  const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(tokenRes.export_request_id).first() as any;
  if (!reqRes || reqRes.current_download_count >= reqRes.max_download_count) {
    return c.json({ error: "Download limit reached" }, 403);
  }
  
  await db.batch([
    db.prepare("UPDATE dataset_download_tokens SET used_at = CURRENT_TIMESTAMP, is_revoked = 1 WHERE id = ?").bind(tokenRes.id),
    db.prepare("UPDATE dataset_export_requests SET current_download_count = current_download_count + 1 WHERE id = ?").bind(reqRes.id)
  ]);
  
  setAuditReadContext(c, {
    resourceType: "dataset_download",
    resourceId: reqRes.id,
    scopeBasis: "token_auth",
    reason: "Downloaded data"
  });
  
  // Here we would return the actual file contents. Mocking for now.
  return c.text("MOCK FILE CONTENT");
});

export default exportsRouter;
`;

fs.writeFileSync('/home/user/webapp/src/api/routes/exports.ts', exportsTs);
