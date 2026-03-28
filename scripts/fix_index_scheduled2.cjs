const fs = require('fs');

const path = '/home/user/webapp/src/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// I will just attach it directly to the app object
content = content.replace(/const worker = \{\n  fetch: app\.fetch,\n  scheduled: async \(event: any, env: any, ctx: any\) => \{\n    ctx\.waitUntil\(runExportCleanupJob\(event, env, ctx\)\);\n  \}\n\};\n\nexport default worker;/m, `
// Attach scheduled to app directly
(app as any).scheduled = async (event: any, env: any, ctx: any) => {
  ctx.waitUntil(runExportCleanupJob(event, env, ctx));
};
export default app;
`);

fs.writeFileSync(path, content);
