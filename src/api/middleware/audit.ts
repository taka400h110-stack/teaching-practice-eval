
import { Context, Next } from "hono";
import { D1Database } from "@cloudflare/workers-types";
import { UserRole } from "../../types";

export type AuditReadContext = {
  resourceType: string;
  resourceId?: string | null;
  targetStudentId?: string | null;
  targetStudentIds?: string[];
  targetCohortId?: string | null;
  targetCourseId?: string | null;
  visibleRecordCount?: number;
  scopeBasis?: string;
  reason?: string;
};

export type AuditWriteContext = {
  resourceType: string;
  resourceId?: string | null;
  targetStudentId?: string | null;
  targetStudentIds?: string[];
  targetCohortId?: string | null;
  targetCourseId?: string | null;
  entityOwnerUserId?: string | null;

  action?: 'create' | 'update' | 'delete';
  scopeBasis?: string;
  reason?: string;

  changedFields?: string[];
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  changeSummary?: Record<string, unknown> | null;
};

export function setAuditReadContext(c: Context, data: AuditReadContext): void {
  c.set("auditReadContext", data);
}

export function setAuditWriteContext(c: Context, data: AuditWriteContext): void {
  c.set("auditWriteContext", data);
}

const AUDIT_PATTERNS = [
  "/api/data/students",
  "/api/data/journals",
  "/api/data/evaluations",
  "/api/data/goals",
  "/api/data/growth",
  "/api/data/self-evals",
  "/api/data/human-evals",
  "/api/data/exports",
];

function shouldAuditRequest(c: Context): boolean {
  const path = c.req.path;
  return AUDIT_PATTERNS.some(pattern => path.startsWith(pattern));
}

function mapOutcome(status: number): string {
  if (status >= 200 && status < 300) return "allowed";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  return "error";
}

function inferResourceTypeFromPath(path: string): string {
  if (path.includes("students")) return "student";
  if (path.includes("journals")) return "journal";
  if (path.includes("evaluations")) return "evaluation";
  if (path.includes("goals")) return "goal";
  if (path.includes("growth")) return "growth";
  if (path.includes("self-evals")) return "self_evaluation";
  if (path.includes("human-evals")) return "human_evaluation";
  return "unknown";
}

function resolveAction(method: string, overrideAction?: string): string {
  if (overrideAction) return overrideAction;
  if (method === 'GET') return 'read';
  if (method === 'POST') return 'create';
  if (method === 'PUT' || method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return 'read';
}

export async function auditReadMiddleware(c: Context, next: Next) {
  if (c.req.method !== "GET") return next();
  await performAudit(c, next, "read");
}

export async function auditWriteMiddleware(c: Context, next: Next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)) return next();
  await performAudit(c, next, "write");
}

async function performAudit(c: Context, next: Next, auditType: "read" | "write") {
  if (!shouldAuditRequest(c)) return next();

  let thrownError: any = null;

  try {
    await next();
  } catch (err) {
    thrownError = err;
    throw err;
  } finally {
    const db = c.env?.DB as D1Database | undefined;
    if (db) {
      const audit = c.get(auditType === "read" ? "auditReadContext" : "auditWriteContext") as AuditReadContext | AuditWriteContext | undefined;
      const user = c.get("user") || null;
      const status = c.res?.status ?? (thrownError ? 500 : 200);
      
      const payload: any = {
        id: crypto.randomUUID(),
        request_id: c.get("requestId") ?? null,
        actor_user_id: user?.id ?? null,
        actor_role: user?.role ?? null,
        action: resolveAction(c.req.method, (audit as any)?.action),
        resource_type: audit?.resourceType ?? inferResourceTypeFromPath(c.req.path),
        resource_id: audit?.resourceId ?? null,
        target_student_id: audit?.targetStudentId ?? null,
        target_student_ids_json: audit?.targetStudentIds ? JSON.stringify(audit.targetStudentIds.slice(0, 100)) : null,
        target_cohort_id: audit?.targetCohortId ?? null,
        target_course_id: audit?.targetCourseId ?? null,
        entity_owner_user_id: (audit as AuditWriteContext)?.entityOwnerUserId ?? null,
        http_method: c.req.method,
        endpoint: c.req.path,
        route_pattern: c.req.routePath ?? null,
        query_params_json: JSON.stringify(c.req.query() || {}),
        status_code: status,
        outcome: mapOutcome(status),
        visible_record_count: (audit as any)?.visibleRecordCount ?? null,
        scope_basis: audit?.scopeBasis ?? null,
        reason: audit?.reason ?? (thrownError ? "handler_exception" : null),
        change_summary_json: (audit as AuditWriteContext)?.changeSummary ? JSON.stringify((audit as AuditWriteContext).changeSummary) : null,
        changed_fields_json: (audit as AuditWriteContext)?.changedFields ? JSON.stringify((audit as AuditWriteContext).changedFields) : null,
        before_state_json: (audit as AuditWriteContext)?.beforeState ? JSON.stringify((audit as AuditWriteContext).beforeState) : null,
        after_state_json: (audit as AuditWriteContext)?.afterState ? JSON.stringify((audit as AuditWriteContext).afterState) : null,
        ip_hash: "hash_placeholder",
        user_agent: c.req.header("user-agent") ?? null,
      };

      try {
        await db.prepare(`
          INSERT INTO audit_logs (
            id, request_id, actor_user_id, actor_role, action, resource_type, resource_id,
            target_student_id, target_student_ids_json, target_cohort_id, target_course_id, entity_owner_user_id,
            http_method, endpoint, route_pattern, query_params_json, status_code, outcome,
            visible_record_count, scope_basis, reason, change_summary_json, changed_fields_json, before_state_json, after_state_json, ip_hash, user_agent
          ) VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?
          )
        `).bind(
          payload.id, payload.request_id, payload.actor_user_id, payload.actor_role, payload.action, payload.resource_type, payload.resource_id,
          payload.target_student_id, payload.target_student_ids_json, payload.target_cohort_id, payload.target_course_id, payload.entity_owner_user_id,
          payload.http_method, payload.endpoint, payload.route_pattern, payload.query_params_json, payload.status_code, payload.outcome,
          payload.visible_record_count, payload.scope_basis, payload.reason, payload.change_summary_json, payload.changed_fields_json, payload.before_state_json, payload.after_state_json, payload.ip_hash, payload.user_agent
        ).run();
      } catch (insertErr) {
        console.error("Failed to insert audit log", insertErr);
      }
    }
  }
}
