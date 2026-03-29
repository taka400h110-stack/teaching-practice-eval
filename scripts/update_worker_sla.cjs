const fs = require('fs');
const path = require('path');

const workerFile = path.join(__dirname, '../src/worker.ts');
let content = fs.readFileSync(workerFile, 'utf8');

if (!content.includes('runCleanupAlertSlaJob')) {
  content = content.replace(
    "import { runCleanupAlertEscalation } from './api/jobs/cleanupAlertEscalation';",
    "import { runCleanupAlertEscalation } from './api/jobs/cleanupAlertEscalation';\nimport { runCleanupAlertSlaJob } from './api/jobs/cleanupAlertSlaJob';"
  );
  
  content = content.replace(
    "runCleanupAlertEscalation(env)",
    "runCleanupAlertEscalation(env),\n        runCleanupAlertSlaJob(env)"
  );
  
  fs.writeFileSync(workerFile, content);
  console.log('Added runCleanupAlertSlaJob to worker.ts');
} else {
  console.log('runCleanupAlertSlaJob already in worker.ts');
}
