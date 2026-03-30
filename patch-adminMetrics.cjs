const fs = require('fs');
const file = '/home/user/webapp/src/api/routes/adminMetrics.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace(/return c\.json\(\{\n      successRate: 0,[\s\S]*?trend: \[\]\n    \}, 200\);/g, `return c.json({
      range: range || "7d",
      generatedAt: new Date().toISOString(),
      summary: {
        executions: 0,
        deletedTotal: 0,
        deletedTokens: 0,
        deletedObjects: 0,
        deletedOrphans: 0,
        errors: 0,
        lastRunAt: null,
        lastRunOutcome: "unknown"
      },
      dailySeries: [],
      recentRuns: [],
      recentErrors: []
    }, 200);`);
fs.writeFileSync(file, code);
