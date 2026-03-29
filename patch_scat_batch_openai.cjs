const fs = require('fs');
const path = require('path');

const openaiRoutePath = path.join(__dirname, 'src', 'api', 'routes', 'openai.ts');
let openaiCode = fs.readFileSync(openaiRoutePath, 'utf8');

const batchRouteCode = `
// POST /scat-analysis/batch
openaiRouter.post('/scat-analysis/batch', requireRole(['admin', 'researcher']), async (c) => {
  try {
    const body = await c.req.json();
    const { journal_ids, model } = body;
    
    if (!Array.isArray(journal_ids) || journal_ids.length === 0) {
      return c.json({ error: 'Valid journal_ids array is required' }, 400);
    }
    
    // In a real implementation, this would enqueue jobs or process them sequentially
    // For now, we return a mock success
    return c.json({ 
      success: true, 
      message: \`Batch analysis started for \${journal_ids.length} journals\`,
      job_id: 'batch_' + Date.now()
    });
  } catch (error) {
    console.error('Batch SCAT error:', error);
    return c.json({ error: 'Failed to start batch SCAT analysis' }, 500);
  }
});
`;

if (!openaiCode.includes('/scat-analysis/batch')) {
  openaiCode = openaiCode.replace('export { openaiRouter }', batchRouteCode + '\nexport { openaiRouter }');
  fs.writeFileSync(openaiRoutePath, openaiCode);
  console.log('Added /scat-analysis/batch route to openai.ts');
}
