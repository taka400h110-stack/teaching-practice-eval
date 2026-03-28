const fs = require('fs');
const files = [
  '/home/user/webapp/src/api/services/pagerDutyIncidentProvider.ts',
  '/home/user/webapp/src/api/services/opsgenieIncidentProvider.ts',
  '/home/user/webapp/src/api/services/genericWebhookIncidentProvider.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/\\`/g, '`');
  content = content.replace(/\\\$/g, '$');
  fs.writeFileSync(file, content);
});
console.log('Fixed syntax errors');
