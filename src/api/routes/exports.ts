
import { Hono } from "hono";
import { requireAuth, requireRoles } from "../middleware/auth";
import { setAuditWriteContext, setAuditReadContext } from "../middleware/audit";
import { resolveResearchScope } from "../services/researchScope";
import { applyAnonymization } from "../services/anonymization";
import { getScopeContext, buildScopeFilter } from "../middleware/scope";
import { D1Database, R2Bucket } from "@cloudflare/workers-types";
import { UserRole } from "../../types";

type Env = { Bindings: { DB: D1Database, EXPORTS_BUCKET: R2Bucket }, Variables: { user: any } };
const exportsRouter = new Hono<Env>();

const RESEARCH_ROLES: UserRole[] = ["researcher", "collaborator", "board_observer", "admin"];

function generateToken() {
  return crypto.randomUUID() + crypto.randomUUID();
}

async function sha256(text: string) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

exportsRouter.post("/requests", requireAuth, requireRoles(RESEARCH_ROLES), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const body = await c.req.json();
  
  const id = "req-" + crypto.randomUUID();
  const request_type = body.request_type || "export";
  
  if (request_type === "raw_access" && !["admin"].includes(user.role) && !["researcher"].includes(user.role)) {
    return c.json({ error: "Role not allowed to request raw access" }, 403);
  }
  
  await db.prepare(`
    INSERT INTO dataset_export_requests (
      id, requester_user_id, requester_role, request_type, dataset_type, scope_level,
      course_id, cohort_id, student_id, requested_anonymization_level,
      status, purpose, justification, filter_params_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `).bind(
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

exportsRouter.post("/requests/:id/approve", requireAuth, requireRoles(["admin"] as UserRole[]), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  
  const { results } = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).all();
  if (results.length === 0) return c.json({ error: "Not found" }, 404);
  
  await db.prepare(`
    UPDATE dataset_export_requests
    SET status = 'approved', approved_anonymization_level = ?, approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP, max_download_count = ?
    WHERE id = ?
  `).bind(
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

exportsRouter.post("/requests/:id/reject", requireAuth, requireRoles(["admin"] as UserRole[]), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const id = c.req.param("id");
  const body = await c.req.json();
  
  await db.prepare(`
    UPDATE dataset_export_requests
    SET status = 'rejected', rejection_reason = ?, approved_by_user_id = ?, approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(body.rejected_reason, user.id, id).run();
  
  setAuditWriteContext(c, {
    action: "update",
    resourceType: "dataset_export_request",
    resourceId: id,
    scopeBasis: "admin_approval",
    reason: "Rejected data export"
  });
  
  return c.json({ success: true, id });
});

exportsRouter.post("/requests/:id/generate", requireAuth, requireRoles(["admin", "researcher", "collaborator"] as UserRole[]), async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));
  
  const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first() as any;
  if (!reqRes) return c.json({ error: "Not found" }, 404);
  
  if (reqRes.requester_user_id !== user.id && user.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  
  if (reqRes.status !== "approved") {
    return c.json({ error: "Request not approved" }, 400);
  }

  const requesterId = (reqRes.requester_user_id as string);
  const requesterRole = (reqRes.requester_role as string) || "researcher";
  
  const mockContext = { get: (key: string) => key === "user" ? { id: requesterId, role: requesterRole } : null };
  const scopeCtx = await getScopeContext(mockContext as any, db);
  
  let tableName = "journal_entries";
  let datasetType = (reqRes.dataset_type as string) || "journals";
  if (datasetType === "journals") tableName = "journal_entries";
  else if (datasetType === "evaluations") tableName = "evaluations";
  else if (datasetType === "students") tableName = "users";
  
  const scopeFilter = buildScopeFilter(scopeCtx, datasetType === "students" ? "id" : "student_id");
  
  let query = `SELECT * FROM ${tableName} WHERE ${scopeFilter.condition}`;
  const { results } = await db.prepare(query).bind(...scopeFilter.params).all();
  
  const anonLevel = (reqRes.approved_anonymization_level || reqRes.requested_anonymization_level || "pseudonymized") as 'raw' | 'pseudonymized' | 'aggregated';
  const anonymizedData = applyAnonymization(results, {
    role: requesterRole,
    anonymizationLevel: anonLevel as 'raw' | 'pseudonymized' | 'aggregated',
    resourceType: datasetType === "journals" ? "journal" : (datasetType === "evaluations" ? "evaluation" : "student")
  });
  
  let dataString = "";
  let contentType = "application/json";
  let ext = "json";
  
  const exportFormat = (body.format || "json") as string;
  if (exportFormat === "csv" && Array.isArray(anonymizedData) && anonymizedData.length > 0) {
    const headers = Object.keys(anonymizedData[0]);
    const csv = [
      headers.join(","),
      ...anonymizedData.map(r => headers.map(h => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    dataString = csv;
    contentType = "text/csv";
    ext = "csv";
  } else {
    dataString = JSON.stringify(anonymizedData);
  }
  const hash = await sha256(dataString);
  const byteSize = new Blob([dataString]).size;
  
  const objectKey = `exports/${requesterId}/${id}/${Date.now()}/${datasetType}-${anonLevel}.${ext}`;
  
  if (c.env.EXPORTS_BUCKET) {
    await c.env.EXPORTS_BUCKET.put(objectKey, dataString, {
      httpMetadata: {
        contentType: contentType,
        contentDisposition: `attachment; filename="${datasetType}-${anonLevel}.${ext}"`,
        cacheControl: "private, max-age=0, no-store"
      },
      customMetadata: {
        requestId: String(id),
        datasetType: String(datasetType),
        anonymizationLevel: anonLevel as 'raw' | 'pseudonymized' | 'aggregated',
        requesterUserId: String(requesterId)
      },
      sha256: hash
    });
  }

  const rowCount = Array.isArray(anonymizedData) ? anonymizedData.length : 1;
  
  // Note: Since we might not have all columns correctly created if D1 migrate failed, we'll try to update the basic columns.
  // We added them via run_alter, but just in case, we also update export_file_path to objectKey for compatibility.
  await db.prepare(`
    UPDATE dataset_export_requests
    SET status = 'completed', 
        export_file_path = ?, 
        export_row_count = ?, 
        export_summary_json = ?,
        export_object_key = ?,
        export_content_type = ?,
        export_file_size_bytes = ?,
        export_sha256 = ?,
        export_generated_at = CURRENT_TIMESTAMP,
        export_storage_backend = 'r2'
    WHERE id = ?
  `).bind(
    objectKey, rowCount, JSON.stringify({ dataset: String(datasetType), anonLevel }), 
    contentType, byteSize, hash, id
  ).run();
  
  setAuditWriteContext(c, {
    action: "update",
    resourceType: "dataset_export_request",
    resourceId: id,
    scopeBasis: "export_generation",
    reason: "Generated data export",
    changeSummary: {
      action: "export_generate",
      anonymization_level: anonLevel,
      dataset_type: String(datasetType),
      row_count: rowCount
    }
  });
  
  return c.json({ success: true, id, status: "completed" });
});

exportsRouter.post("/requests/:id/download-token", requireAuth, requireRoles(RESEARCH_ROLES), async (c) => {
  const db = c.env.DB;
  const id = c.req.param("id");
  const user = c.get("user");
  
  const reqRes = await db.prepare("SELECT * FROM dataset_export_requests WHERE id = ?").bind(id).first() as any;
  if (!reqRes) return c.json({ error: "Not found" }, 404);
  
  if (reqRes.requester_user_id !== user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }
  if (reqRes.status !== "completed" && reqRes.status !== "generated") {
    return c.json({ error: "Export not generated yet" }, 400);
  }
  if (reqRes.current_download_count >= reqRes.max_download_count) {
    return c.json({ error: "Download limit reached" }, 403);
  }
  
  const token = generateToken();
  const tokenId = "tok-" + crypto.randomUUID();
  
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins for signed URL equivalency
  
  await db.prepare(`
    INSERT INTO dataset_download_tokens (id, export_request_id, token_hash, issued_to_user_id, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(tokenId, id, token, user.id, expiresAt).run();
  
  setAuditWriteContext(c, {
    action: "create",
    resourceType: "dataset_download_token",
    resourceId: tokenId,
    scopeBasis: "token_issuance",
    reason: "Issued download token",
    changeSummary: {
      action: "signed_url_issue"
    }
  });
  
  return c.json({ token, id });
});

exportsRouter.get("/download/:token", async (c) => {
  const db = c.env.DB;
  const token = c.req.param("token");
  
  const tokenRes = await db.prepare(`
    SELECT * FROM dataset_download_tokens WHERE token_hash = ? AND is_revoked = 0 AND expires_at > CURRENT_TIMESTAMP
  `).bind(token).first() as any;
  
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
  
  const objectKey = reqRes.export_object_key || reqRes.export_file_path;
  
  if (c.env.EXPORTS_BUCKET && objectKey && !objectKey.startsWith("data:")) {
    const object = await c.env.EXPORTS_BUCKET.get(objectKey);
    if (!object) {
      return c.json({ error: "Object not found" }, 404);
    }
    
    const headers = new Headers();
    object.writeHttpMetadata(headers as any);
    headers.set('etag', object.httpEtag);
    if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    if (!headers.has('content-disposition')) headers.set('content-disposition', `attachment; filename="export-${reqRes.id}.json"`);
    
    return new Response(object.body as any, { headers });
  }

  // Fallback for previous base64 mock implementation just in case
  if (objectKey && objectKey.startsWith("data:application/json;base64,")) {
    const base64Data = objectKey.split(",")[1];
    const jsonStr = Buffer.from(base64Data, "base64").toString("utf-8");
    return new Response(jsonStr, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="export-${reqRes.id}.json"`
      }
    });
  }
  
  return c.text("MOCK FILE CONTENT: " + objectKey);
});

export default exportsRouter;
