import { Env } from '../../types/env';
import { OperationalReadinessResponse } from '../../types/operationalReadiness';

export async function getOperationalReadiness(env: Env): Promise<OperationalReadinessResponse> {
  const REQUIRED_SECRETS = [
    'PAGERDUTY_ROUTING_KEY',
    'OPSGENIE_API_KEY',
    'RESEND_WEBHOOK_SECRET',
    'SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY',
    'SLACK_CLEANUP_ALERT_WEBHOOK_URL'
  ];

  const OPTIONAL_SECRETS = [
    'GENERIC_WEBHOOK_AUTH_VALUE'
  ];

  const missing = REQUIRED_SECRETS.filter(key => !(env as any)[key]);
  const optionalMissing = OPTIONAL_SECRETS.filter(key => !(env as any)[key]);

  const providersQuery = await env.DB.prepare(`
    SELECT provider, 
           COUNT(*) as total,
           SUM(CASE WHEN status = 'triggered' OR status = 'resolved' THEN 1 ELSE 0 END) as success_count,
           SUM(CASE WHEN last_error IS NOT NULL THEN 1 ELSE 0 END) as failure_count,
           MAX(CASE WHEN status = 'triggered' OR status = 'resolved' THEN last_sent_at ELSE NULL END) as latest_success,
           MAX(CASE WHEN last_error IS NOT NULL THEN updated_at ELSE NULL END) as latest_failure,
           MAX(last_error) as last_error_msg
    FROM cleanup_alert_incidents
    WHERE created_at >= datetime('now', '-1 day')
    GROUP BY provider
  `).all();

  const providersStatus = ['pagerduty', 'opsgenie', 'generic'].map(name => {
    const row: any = providersQuery.results.find(r => r.provider === name) || { total: 0, failure_count: 0 };
    const enabledKey = `${name.toUpperCase()}_ENABLED`;
    const enabled = (env as any)[enabledKey] === 'true';
    
    let status: 'healthy' | 'degraded' | 'failing' | 'disabled' = enabled ? 'healthy' : 'disabled';
    const failRate = row.total > 0 ? row.failure_count / row.total : 0;
    
    if (enabled) {
      if (failRate > 0.5) status = 'failing';
      else if (failRate > 0) status = 'degraded';
    }

    return {
      name,
      enabled,
      status,
      latestSuccessAt: row.latest_success || null,
      latestFailureAt: row.latest_failure || null,
      failureCount24h: row.failure_count || 0,
      failureRate24h: failRate,
      lastError: row.last_error_msg || null,
    };
  });

  const hasScheduled = true;
  
  const blockingIssues = [];
  if (missing.length > 0) blockingIssues.push(`Missing required secrets: ${missing.join(', ')}`);
  
  return {
    generatedAt: new Date().toISOString(),
    environment: (env as any).APP_ENV || 'production',
    secrets: {
      required: REQUIRED_SECRETS,
      missing,
      optionalMissing
    },
    cron: {
      hasScheduledHandler: hasScheduled,
      configuredCrons: ['*/15 * * * *', '10 0 * * *'],
      warnings: []
    },
    providers: providersStatus,
    readiness: {
      ok: blockingIssues.length === 0,
      blockingIssues,
      warnings: []
    }
  };
}
