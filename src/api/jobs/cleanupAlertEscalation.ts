import { Env } from "../../types/env";
import { evaluateEscalations } from "../services/cleanupAlertEscalationService";

export const runCleanupAlertEscalationJob = async (env: Env): Promise<void> => {
  console.log("Running cleanup alert escalation cron job");
  try {
    await evaluateEscalations(env);
  } catch (error) {
    console.error("Error evaluating escalations:", error);
  }
};
