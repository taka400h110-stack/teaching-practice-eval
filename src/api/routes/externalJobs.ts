import { Hono } from "hono";
import { requireRoles } from "../middleware/auth";

const externalJobsRouter = new Hono<{ Bindings: { DB: any }, Variables: { user: any } }>();

// GET list of jobs
externalJobsRouter.get("/", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  const { results } = await db.prepare("SELECT * FROM external_analysis_jobs ORDER BY created_at DESC").all();
  return c.json({ success: true, jobs: results });
});

// POST create a job
externalJobsRouter.post("/", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const body = await c.req.json();
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'job-' + Date.now() + '-' + Math.floor(Math.random()*1000);

    const stmt = db.prepare(`
      INSERT INTO external_analysis_jobs (id, job_type, created_by_user_id, created_by_role, source_dataset_type, parameters_json, status)
      VALUES (?, ?, ?, ?, ?, ?, 'queued')
    `).bind(
      id,
      body.job_type || "UNKNOWN",
      c.get("user")?.id || "unknown_user",
      c.get("user")?.role || "unknown_role",
      body.dataset_type || "default",
      JSON.stringify(body.parameters || {})
    );

    await stmt.run();
    return c.json({ success: true, job_id: id, message: "Job created. Awaiting external processing." });
  } catch (err: any) {
    console.error("Job creation error:", err);
    return c.json({ error: err.message }, 500);
  }
});

// POST import results
externalJobsRouter.post("/:id/complete", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);

  try {
    const jobId = c.req.param("id");
    const body = await c.req.json();

    const status = body.status || "completed";
    const resultSummary = JSON.stringify(body.result_summary || {});
    const errorMessage = body.error_message || null;

    const stmt = db.prepare(`
      UPDATE external_analysis_jobs 
      SET status = ?, result_summary_json = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, resultSummary, errorMessage, jobId);

    await stmt.run();
    return c.json({ success: true, message: "Job updated" });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// GET download dataset
externalJobsRouter.get("/:id/download", requireRoles(["researcher", "admin", "collaborator", "board_observer"]), async (c) => {
  
  const db = c.env?.DB;
  if (!db) return c.json({ error: "DB not configured" }, 503);
  
  const jobId = c.req.param("id");
  const jobResult = await db.prepare("SELECT * FROM external_analysis_jobs WHERE id = ?").bind(jobId).first();
  if (!jobResult) return c.json({ error: "Job not found" }, 404);

  const dataset = {
    metadata: {
      job_id: jobId,
      job_type: jobResult.job_type,
      exported_at: new Date().toISOString()
    },
    data_dictionary: {
      "user_id": "Unique identifier for student",
      "week": "Week number of the evaluation",
      "factor_1_score": "Score for factor 1",
      "missing_flag": "1 if missing, 0 otherwise"
    },
    data: [
      { user_id: "user-1", week: 1, factor_1_score: 3.5, missing_flag: 0 },
      { user_id: "user-2", week: 1, factor_1_score: null, missing_flag: 1 }
    ]
  };

  return c.json(dataset);
});

export default externalJobsRouter;
