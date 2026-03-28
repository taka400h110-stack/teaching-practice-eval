const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '../src/api/routes/adminAlerts.ts');
let routesContent = fs.readFileSync(routesPath, 'utf8');

routesContent = routesContent.replace(/adminAlertsRouter\.get\("\/history"[\s\S]*?getCleanupAlertHistory.*?;/m, `adminAlertsRouter.get("/history", async (c) => {
  const db = c.env.DB;
  const query = {
    range: (c.req.query("range") || "30d") as any,
    dateFrom: c.req.query("dateFrom"),
    dateTo: c.req.query("dateTo"),
    eventTypes: c.req.query("eventTypes"),
    severities: c.req.query("severities"),
    channels: c.req.query("channels"),
    outcomes: c.req.query("outcomes"),
    reasonQuery: c.req.query("reasonQuery"),
    fingerprintPrefix: c.req.query("fingerprintPrefix"),
    actorUserId: c.req.query("actorUserId"),
    sort: (c.req.query("sort") || "createdAt:desc") as any,
    limit: parseInt(c.req.query("limit") || "50", 10),
    cursor: c.req.query("cursor")
  };

  try {
    const data = await getCleanupAlertHistory(c.env.DB, query);`);

fs.writeFileSync(routesPath, routesContent);
console.log("Fixed routes");
