const fs = require('fs');
const path = '/home/user/webapp/src/api/middleware/audit.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /visible_record_count: audit\?\.visibleRecordCount \?\? null,/,
  'visible_record_count: (audit as any)?.visibleRecordCount ?? null,'
);

fs.writeFileSync(path, code);
