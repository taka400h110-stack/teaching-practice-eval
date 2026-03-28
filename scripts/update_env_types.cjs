const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../src/types/env.ts');
let envContent = fs.readFileSync(envPath, 'utf8');

// Add new properties if they don't exist
const propertiesToAdd = `
  RESEND_WEBHOOK_SECRET?: string;
  SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY?: string;
  EMAIL_WEBHOOK_ACCEPT_PROVIDERS?: string;
  EMAIL_DELIVERY_TRACKING_ENABLED?: string;
  CLEANUP_ALERT_ESCALATION_ENABLED?: string;
  CLEANUP_ALERT_ESCALATION_L1_MINUTES?: string;
  CLEANUP_ALERT_ESCALATION_L2_MINUTES?: string;
  CLEANUP_ALERT_ESCALATION_L3_MINUTES?: string;
  CLEANUP_ALERT_ESCALATION_NOTIFY_EMAIL?: string;
  CLEANUP_ALERT_ESCALATION_NOTIFY_SLACK?: string;
  CLEANUP_ALERT_ESCALATION_REQUIRE_UNACKED?: string;
`;

if (!envContent.includes('RESEND_WEBHOOK_SECRET')) {
  envContent = envContent.replace('export interface Env {', `export interface Env {${propertiesToAdd}`);
  fs.writeFileSync(envPath, envContent);
  console.log('Updated src/types/env.ts');
} else {
  console.log('src/types/env.ts already updated');
}
