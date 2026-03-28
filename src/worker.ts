import app from './index'
import { runExportCleanupJob } from './api/jobs/exportCleanup'
import { runCleanupAlertEscalationJob } from './api/jobs/cleanupAlertEscalation'

export default {
  fetch: app.fetch,
  async scheduled(event: any, env: any, ctx: any) {
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil((async () => {
        try {
          await runExportCleanupJob(event, env, ctx);
        } catch (e) {
          console.error("Error in runExportCleanupJob:", e);
        }
        try {
          await runCleanupAlertEscalationJob(env);
        } catch (e) {
          console.error("Error in runCleanupAlertEscalationJob:", e);
        }
      })());
    } else {
      try {
        await runExportCleanupJob(event, env, ctx);
      } catch (e) {
        console.error("Error in runExportCleanupJob:", e);
      }
      try {
        await runCleanupAlertEscalationJob(env);
      } catch (e) {
        console.error("Error in runCleanupAlertEscalationJob:", e);
      }
    }
  }
}
