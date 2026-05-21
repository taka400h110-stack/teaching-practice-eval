/**
 * 分析状態 (analysis_state) と ISM / SP表 / 伝達係数 の現行値を返すルート群
 *
 * 仕様: docs/analysis/scat_to_ism_pipeline.md §5
 */
import { Hono } from "hono";
import { requireAuth, requireRoles } from "../middleware/auth";
import { D1Database } from "@cloudflare/workers-types";
import { UserRole } from "../../types";
import {
  getAnalysisState,
  markScatDependentsDirty,
  recomputeIsmIfDirty,
  recomputeSpTableIfDirty,
  getTransmissionScore,
} from "../services/scatDerivedAnalysis";

type Env = { Bindings: { DB: D1Database }; Variables: { user: any } };
const analysisRouter = new Hono<Env>();

const READ_ROLES: UserRole[] = [
  "researcher",
  "admin",
  "collaborator",
  "board_observer",
  "teacher",
  "univ_teacher",
  "school_mentor",
];
const ADMIN_ROLES: UserRole[] = ["admin", "researcher", "collaborator"];

// ────────────────────────────────────────────────
// GET /api/data/analysis/state
//   現在の dirty フラグ・最終計算時刻を返す
// ────────────────────────────────────────────────
analysisRouter.get("/state", requireAuth, requireRoles(READ_ROLES), async (c) => {
  const db = c.env.DB;
  const scope = c.req.query("scope") || "global";
  try {
    const state = await getAnalysisState(db, scope);
    return c.json({ scope, state });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────
// POST /api/data/analysis/recompute
//   手動再計算 (管理者・研究者・共同研究者)
// ────────────────────────────────────────────────
analysisRouter.post("/recompute", requireAuth, requireRoles(ADMIN_ROLES), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const scope = c.req.query("scope") || "global";
  try {
    // dirty フラグを立てる
    await markScatDependentsDirty(db, scope);
    // ISM と SP 表を計算
    const sp = await recomputeSpTableIfDirty(db, scope, user?.id);
    return c.json({
      success: true,
      scope,
      ism: { sourceHash: sp.sourceHash },
      sp: {
        studentCount: sp.students.length,
        problemCount: sp.problems.length,
      },
    });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────
// GET /api/data/ism/current
//   最新の ISM 結果。dirty なら再計算してから返す
// ────────────────────────────────────────────────
analysisRouter.get("/ism/current", requireAuth, requireRoles(READ_ROLES), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const scope = c.req.query("scope") || "global";
  try {
    const result = await recomputeIsmIfDirty(db, scope, user?.id);
    const state = await getAnalysisState(db, scope);
    return c.json({
      scope,
      ...result,
      computed_at: state.ism_computed_at,
    });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────
// GET /api/data/sp-tables/current
//   最新の SP 表。dirty なら再計算してから返す
// ────────────────────────────────────────────────
analysisRouter.get("/sp-tables/current", requireAuth, requireRoles(READ_ROLES), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const scope = c.req.query("scope") || "global";
  try {
    const result = await recomputeSpTableIfDirty(db, scope, user?.id);
    const state = await getAnalysisState(db, scope);
    return c.json({
      scope,
      ...result,
      computed_at: state.sp_computed_at,
    });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

// ────────────────────────────────────────────────
// GET /api/data/transmission/current
//   最新の伝達係数
// ────────────────────────────────────────────────
analysisRouter.get("/transmission/current", requireAuth, requireRoles(READ_ROLES), async (c) => {
  const db = c.env.DB;
  const user = c.get("user");
  const scope = c.req.query("scope") || "global";
  try {
    const result = await getTransmissionScore(db, scope, user?.id);
    const state = await getAnalysisState(db, scope);
    return c.json({
      scope,
      ...result,
      computed_at: state.transmission_computed_at,
    });
  } catch (err: any) {
    return c.json({ error: String(err) }, 500);
  }
});

export default analysisRouter;
