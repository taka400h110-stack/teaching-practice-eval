const fs = require('fs');
const path = require('path');

const typesFile = path.join(__dirname, '../src/types/adminAlerts.ts');
let content = fs.readFileSync(typesFile, 'utf8');

if (!content.includes('ackDeadlineAt')) {
  content = content.replace(
    'detailUrl: string;',
    'detailUrl: string;\n  ackDeadlineAt?: string | null;\n  ackBreached?: boolean;\n  resolveDeadlineAt?: string | null;\n  resolveBreached?: boolean;\n  renotifyCount?: number;\n  lastRenotifiedAt?: string | null;'
  );
  
  fs.writeFileSync(typesFile, content);
  console.log('Updated adminAlerts.ts with SLA types');
} else {
  console.log('SLA types already in adminAlerts.ts');
}
