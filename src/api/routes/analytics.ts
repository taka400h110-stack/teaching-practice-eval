import { Hono } from "hono";
import { requireRoles } from "../middleware/auth";

const analyticsRouter = new Hono<{ Bindings: CloudflareBindings }>();

// L1-L4 Data Pipeline Real Count
analyticsRouter.get("/pipeline", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  try {
    const [{count: evals}] = await db.prepare("SELECT count(*) as count FROM evaluations").all().then(r => r.results);
    const [{count: journals}] = await db.prepare("SELECT count(*) as count FROM journal_entries").all().then(r => r.results);
    const [{count: students}] = await db.prepare("SELECT count(DISTINCT student_id) as count FROM journal_entries").all().then(r => r.results);
    const [{count: users}] = await db.prepare("SELECT count(*) as count FROM users").all().then(r => r.results);

    return c.json({
      run_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      layers: {
        L1: { name: "users & auth", count: users, missing_flag_handled: true },
        L2: { name: "students", count: students, missing_flag_handled: true },
        L3: { name: "journals", count: journals, missing_flag_handled: true },
        L4: { name: "evaluations", count: evals, missing_flag_handled: true },
      }
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// G-Methods (IPTW / MSM) - Mark as Not Available
analyticsRouter.post("/g-methods", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  return c.json({
    run_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    method: "IPTW (Inverse Probability of Treatment Weighting)",
    status: "not_available",
    message: "G-methods analysis is currently disabled and requires external statistical software (e.g., R/causalweight)."
  });
});

// Fairness & Validity Audit
analyticsRouter.get("/fairness", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), (c) => {
  return c.json({
    run_id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    status: "not_available",
    message: "Automated fairness and validity audit is not fully implemented in-system. Please use exported data for external analysis."
  });
});

export default analyticsRouter;
