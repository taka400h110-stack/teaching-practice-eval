const fs = require('fs');

const path = '/home/user/webapp/wrangler.jsonc';
let content = fs.readFileSync(path, 'utf8');

// Insert vars and triggers before the last brace
const newConfig = `
  "vars": {
    "EXPORT_TOKEN_RETENTION_HOURS": "24",
    "EXPORT_USED_TOKEN_RETENTION_HOURS": "72",
    "EXPORT_OBJECT_RETENTION_DAYS": "30",
    "RAW_EXPORT_RETENTION_HOURS": "24",
    "EXPORT_CLEANUP_BATCH_SIZE": "100",
    "EXPORT_CLEANUP_DELETE_BATCH_SIZE": "500",
    "EXPORT_CLEANUP_DRY_RUN": "false",
    "AUDIT_SYSTEM_ACTOR_ID": "system-cron",
    "AUDIT_SYSTEM_ACTOR_ROLE": "system",
    "EXPORT_R2_PREFIX": "exports/"
  },
  "triggers": {
    "crons": [
      "*/15 * * * *",
      "10 0 * * *"
    ]
  }
}
`;

content = content.replace(/}\s*$/, newConfig);
fs.writeFileSync(path, content);
