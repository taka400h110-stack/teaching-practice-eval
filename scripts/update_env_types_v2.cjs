const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../src/types/env.ts');
let envContent = fs.readFileSync(envPath, 'utf8');

const propertiesToAdd = `
  INCIDENT_INTEGRATION_ENABLED?: string;
  INCIDENT_DEFAULT_PROVIDER?: string;
  PAGERDUTY_ENABLED?: string;
  PAGERDUTY_ROUTING_KEY?: string;
  PAGERDUTY_SEVERITY_WARNING?: string;
  PAGERDUTY_SEVERITY_CRITICAL?: string;
  OPSGENIE_ENABLED?: string;
  OPSGENIE_API_KEY?: string;
  OPSGENIE_API_URL?: string;
  OPSGENIE_TEAM?: string;
  OPSGENIE_PRIORITY_WARNING?: string;
  OPSGENIE_PRIORITY_CRITICAL?: string;
  GENERIC_WEBHOOK_ENABLED?: string;
  GENERIC_WEBHOOK_URL?: string;
  GENERIC_WEBHOOK_AUTH_HEADER?: string;
  GENERIC_WEBHOOK_AUTH_VALUE?: string;
  CLEANUP_ALERT_SLA_ENABLED?: string;
  CLEANUP_ALERT_ACK_SLA_WARNING_MINUTES?: string;
  CLEANUP_ALERT_ACK_SLA_CRITICAL_MINUTES?: string;
  CLEANUP_ALERT_RESOLVE_SLA_WARNING_MINUTES?: string;
  CLEANUP_ALERT_RESOLVE_SLA_CRITICAL_MINUTES?: string;
  CLEANUP_ALERT_RENOTIFY_INTERVAL_MINUTES?: string;
  CLEANUP_ALERT_RENOTIFY_MAX_COUNT?: string;
  CLEANUP_ALERT_RENOTIFY_CHANNELS?: string;
  CLEANUP_ALERT_RENOTIFY_ON_INVESTIGATING?: string;
`;

if (!envContent.includes('INCIDENT_INTEGRATION_ENABLED')) {
  envContent = envContent.replace('export interface Env {', `export interface Env {${propertiesToAdd}`);
  fs.writeFileSync(envPath, envContent);
  console.log('Updated src/types/env.ts');
} else {
  console.log('src/types/env.ts already updated');
}
