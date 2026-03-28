const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../src/index.tsx');
let content = fs.readFileSync(indexPath, 'utf8');

// remove previous attempts
content = content.replace(/\/\/ Attach scheduled to app directly[\s\S]*?export default app;/m, `
export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runExportCleanupJob(event, env, ctx));
  }
};
`);

fs.writeFileSync(indexPath, content);
console.log('Updated src/index.tsx with correct scheduled handler');
