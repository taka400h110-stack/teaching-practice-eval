const fs = require('fs');

const path = '/home/user/webapp/src/api/services/exportCleanupService.ts';
let content = fs.readFileSync(path, 'utf8');

// remove unused import
content = content.replace(/import \{ performAudit \} from "..\/middleware\/audit";\n/, "");

fs.writeFileSync(path, content);
