const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '../src/api/routes/adminAlerts.ts');
let content = fs.readFileSync(routePath, 'utf8');

if (!content.includes('/cleanup-failure/escalations')) {
  const routesToAdd = `
app.get('/cleanup-failure/escalations', async (c) => {
  const fingerprint = c.req.query('fingerprint');
  if (!fingerprint) return c.json({ error: 'Missing fingerprint' }, 400);
  
  const escalations = await c.env.DB.prepare(
    "SELECT id, level, status, triggered_at, resolved_at, note FROM cleanup_alert_escalations WHERE fingerprint = ? ORDER BY triggered_at DESC"
  ).bind(fingerprint).all();
  
  return c.json({ escalations: escalations.results || [] });
});
`;

  // Insert before the export default app
  content = content.replace('export default app;', `${routesToAdd}\nexport default app;`);
  fs.writeFileSync(routePath, content);
  console.log('Added escalations route to adminAlerts.ts');
}
