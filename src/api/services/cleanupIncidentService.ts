import { Env } from '../../types/env';
import { TriggerIncidentInput, ResolveIncidentInput } from '../../types/incidents';
import { getIncidentProvider } from './incidentProviderFactory';
import { insertCleanupAuditLog as insertAuditLog } from './exportCleanupService';

export async function triggerIncident(env: Env, input: TriggerIncidentInput): Promise<boolean> {
  if (env.INCIDENT_INTEGRATION_ENABLED !== 'true') return false;

  const providerName = env.INCIDENT_DEFAULT_PROVIDER || 'generic';
  const provider = getIncidentProvider(providerName, env);
  
  if (!provider) {
    console.warn(`Incident provider ${providerName} is not configured properly.`);
    return false;
  }

  try {
    const result = await provider.trigger(input);
    
    await env.DB.prepare(`
      INSERT INTO cleanup_alert_incidents 
        (id, fingerprint, provider, provider_incident_id, provider_dedup_key, status, severity, payload_json, last_sent_at, last_response_code, last_error, created_at, updated_at)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, 'triggered', ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(fingerprint, provider) DO UPDATE SET
        status = 'triggered',
        provider_incident_id = excluded.provider_incident_id,
        provider_dedup_key = excluded.provider_dedup_key,
        severity = excluded.severity,
        payload_json = excluded.payload_json,
        last_sent_at = CURRENT_TIMESTAMP,
        last_response_code = excluded.last_response_code,
        last_error = excluded.last_error,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      input.fingerprint,
      providerName,
      result.providerIncidentId || null,
      result.providerDedupKey,
      input.severity,
      result.payloadJson,
      result.responseCode || null,
      result.error || null
    ).run();

    await insertAuditLog(env, {
      action: result.success ? 'export_cleanup_incident_trigger' : 'export_cleanup_incident_failed',
      actor_user_id: 'system',
      resource_type: 'cleanup_alert_incident',
      resource_id: input.fingerprint,
      details: { provider: providerName, result }
    });

    return result.success;
  } catch (err) {
    console.error(`Error triggering incident for ${providerName}:`, err);
    return false;
  }
}

export async function resolveIncident(env: Env, input: ResolveIncidentInput): Promise<boolean> {
  if (env.INCIDENT_INTEGRATION_ENABLED !== 'true') return false;

  const providerName = env.INCIDENT_DEFAULT_PROVIDER || 'generic';
  const provider = getIncidentProvider(providerName, env);
  
  if (!provider) return false;

  try {
    const result = await provider.resolve(input);
    
    await env.DB.prepare(`
      UPDATE cleanup_alert_incidents
      SET status = 'resolved',
          last_sent_at = CURRENT_TIMESTAMP,
          last_response_code = ?,
          last_error = ?,
          updated_at = CURRENT_TIMESTAMP,
          resolved_at = CURRENT_TIMESTAMP
      WHERE fingerprint = ? AND provider = ? AND status != 'resolved'
    `).bind(
      result.responseCode || null,
      result.error || null,
      input.fingerprint,
      providerName
    ).run();

    await insertAuditLog(env, {
      action: result.success ? 'export_cleanup_incident_resolve' : 'export_cleanup_incident_failed',
      actor_user_id: 'system',
      resource_type: 'cleanup_alert_incident',
      resource_id: input.fingerprint,
      details: { provider: providerName, result, reason: input.reason }
    });

    return result.success;
  } catch (err) {
    console.error(`Error resolving incident for ${providerName}:`, err);
    return false;
  }
}

export async function getIncidentsForAlert(env: Env, fingerprint: string) {
  const result = await env.DB.prepare(`
    SELECT * FROM cleanup_alert_incidents WHERE fingerprint = ? ORDER BY created_at DESC
  `).bind(fingerprint).all();
  return result.results;
}
