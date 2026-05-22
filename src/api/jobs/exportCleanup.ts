import { Env } from "../../types/env";
import { 
  CleanupSummary,
  cleanupExpiredDownloadTokens, 
  cleanupExpiredExportObjects, 
  reconcileMissingExportObjects, 
  insertCleanupAuditLog 
} from "../services/exportCleanupService";
import { getCleanupFailureAlert } from "../services/cleanupAlertService";
import { NotificationService } from "../services/notificationService";
import { SlackNotifier } from "../services/slackNotifier";
import { EmailNotifier } from "../services/emailNotifier";
import { calculateSlaDeadline, upsertSlaEvent } from "../services/cleanupAlertSlaService";

async function evaluateAndNotifyAlerts(env: Env) {
  try {
    // Only fetch for system user equivalent
    const alert = await getCleanupFailureAlert(env.DB, "system");
    
    if (alert.hasAlert && alert.fingerprint) {
      const notifiers = new NotificationService();
      notifiers.register(new SlackNotifier());
      notifiers.register(new EmailNotifier());

      
      // Setup SLA
      const ackDeadline = await calculateSlaDeadline(env, alert.severity, 'ack', new Date().toISOString());
      if (ackDeadline) await upsertSlaEvent(env, alert.fingerprint, alert.severity, 'ack', ackDeadline);
      
      const resolveDeadline = await calculateSlaDeadline(env, alert.severity, 'resolve', new Date().toISOString());
      if (resolveDeadline) await upsertSlaEvent(env, alert.fingerprint, alert.severity, 'resolve', resolveDeadline);
      
      await notifiers.sendAll(alert, env);

    }
  } catch (error) {
    console.error("Failed to evaluate and notify cleanup alerts:", error);
  }
}

async function runLightCleanup(env: Env, scheduledTime: Date, summary: CleanupSummary) {
  const nowIso = scheduledTime.toISOString();
  await cleanupExpiredDownloadTokens(env, nowIso, summary);
  await cleanupExpiredExportObjects(env, nowIso, summary);
}

async function runDeepCleanup(env: Env, scheduledTime: Date, summary: CleanupSummary) {
  const nowIso = scheduledTime.toISOString();
  await reconcileMissingExportObjects(env, nowIso, summary);
  // Optionally run cleanupOrphanR2Objects here
}

export async function runExportCleanupJob(
  event: any, // ScheduledController or similar
  env: Env,
  ctx?: ExecutionContext
) {
  const cron = event.cron || "manual";
  const scheduledTime = event.scheduledTime ? new Date(event.scheduledTime) : new Date();
  
  const summary: CleanupSummary = {
    cron,
    startedAt: new Date().toISOString(),
    finishedAt: "",
    dryRun: env.EXPORT_CLEANUP_DRY_RUN === "true",
    expiredTokensScanned: 0,
    expiredTokensDeleted: 0,
    exportRequestsScanned: 0,
    exportObjectsDeleted: 0,
    exportRowsUpdated: 0,
    missingObjectsDetected: 0,
    orphanObjectsDeleted: 0,
    errors: []
  };

  try {
    if (cron === "*/15 * * * *") {
      await runLightCleanup(env, scheduledTime, summary);
    } else if (cron === "10 0 * * *") {
      await runLightCleanup(env, scheduledTime, summary);
      await runDeepCleanup(env, scheduledTime, summary);
    } else {
      // Manual or unknown cron - run both to be safe
      await runLightCleanup(env, scheduledTime, summary);
      await runDeepCleanup(env, scheduledTime, summary);
    }
  } catch (error: any) {
    summary.errors.push({ phase: 'global', message: String(error) });
  }

  summary.finishedAt = new Date().toISOString();

  // Insert summary log
  await insertCleanupAuditLog(env, {
    action: "export_cleanup_run",
    resourceType: "export_cleanup_job",
    resourceId: `cron-${scheduledTime.toISOString()}`,
    outcome: summary.errors.length > 0 ? "warning" : "success",
    changeSummary: summary
  });

  // Evaluate and notify alerts
  await evaluateAndNotifyAlerts(env);
}
