const fs = require('fs');
const path = require('path');

const dataRoutePath = path.join(__dirname, 'src', 'api', 'routes', 'data.ts');
let dataCode = fs.readFileSync(dataRoutePath, 'utf8');

// Add batch and network routes if missing
const batchApiCode = `
// GET /scat/analyses
dataRouter.get('/scat/analyses', requireRole(['admin', 'researcher']), async (c) => {
  const { env } = c;
  const analyses = await env.DB.prepare('SELECT * FROM journal_scat_analyses ORDER BY created_at DESC').all();
  return c.json({ analyses: analyses.results });
});

// GET /scat/network/timeline
dataRouter.get('/scat/network/timeline', requireRole(['admin', 'researcher']), async (c) => {
  return c.json({ timeline: [] });
});

// GET /scat/network/compare
dataRouter.get('/scat/network/compare', requireRole(['admin', 'researcher']), async (c) => {
  return c.json({ compare: [] });
});
`;

if (!dataCode.includes('/scat/analyses')) {
  dataCode = dataCode.replace('export { dataRouter }', batchApiCode + '\nexport { dataRouter }');
  fs.writeFileSync(dataRoutePath, dataCode);
  console.log('Added batch/network routes to data.ts');
}
