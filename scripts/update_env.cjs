const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/types/env.ts');
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('CLEANUP_ALERT_COOLDOWN_MINUTES')) {
  content = content.replace(
    'EMAIL_PROVIDER_API_KEY?: string;',
    `EMAIL_PROVIDER_API_KEY?: string;

  CLEANUP_ALERT_COOLDOWN_MINUTES?: string;
  CLEANUP_ALERT_CRITICAL_COOLDOWN_MINUTES?: string;
  CLEANUP_ALERT_NOTIFY_ON_WARNING?: string;
  CLEANUP_ALERT_NOTIFY_ON_CRITICAL?: string;`
  );
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Updated Env interface');
}
