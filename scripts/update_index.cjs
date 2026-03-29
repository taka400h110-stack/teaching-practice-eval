const fs = require('fs');

const path = '/home/user/webapp/src/index.tsx';
let content = fs.readFileSync(path, 'utf8');

// replace "export default app;" with the new default export
const newExport = `
import { runExportCleanupJob } from "./api/jobs/exportCleanup";

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: any, ctx: any) => {
    ctx.waitUntil(runExportCleanupJob(event, env, ctx));
  }
};
`;

content = content.replace("export default app;", newExport);
fs.writeFileSync(path, content);
