const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '../src/api/routes/adminAlerts.ts');
let content = fs.readFileSync(routesPath, 'utf8');

if (!content.includes('/acknowledge')) {
  // Add import
  content = content.replace(
    `import { getCleanupFailureAlert, dismissCleanupAlert } from "../services/cleanupAlertService";`,
    `import { getCleanupFailureAlert, dismissCleanupAlert, upsertCleanupAlertAcknowledgment } from "../services/cleanupAlertService";`
  );

  // Add acknowledge route
  content = content.replace(
    `adminAlertsRouter.get("/history",`,
    `adminAlertsRouter.post("/cleanup-failure/acknowledge", async (c) => {
  const userId = c.get("user")?.id;
  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const { fingerprint, status, note } = await c.req.json().catch(() => ({ fingerprint: null, status: null, note: undefined }));
  if (!fingerprint || !status) {
    return c.json({ error: "fingerprint and status required" }, 400);
  }
  if (!['acknowledged', 'investigating', 'resolved'].includes(status)) {
    return c.json({ error: "invalid status" }, 400);
  }

  try {
    const acknowledgment = await upsertCleanupAlertAcknowledgment(c.env, userId, fingerprint, status, note);
    return c.json({ ok: true, fingerprint, acknowledgment });
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    return c.json({ error: "Failed to acknowledge alert" }, 500);
  }
});

adminAlertsRouter.get("/history",`
  );

  fs.writeFileSync(routesPath, content);
}
console.log("Updated adminAlerts.ts for ack");
