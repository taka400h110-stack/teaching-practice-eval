const fs = require('fs');
const path = require('path');

function replaceImport(file) {
  const filePath = path.join(__dirname, '../', file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import { insertAuditLog } from ".\/auditLogService";/g, 'import { insertCleanupAuditLog as insertAuditLog } from "./exportCleanupService";');
  content = content.replace(/import { insertAuditLog } from '\.\/auditLogService';/g, "import { insertCleanupAuditLog as insertAuditLog } from './exportCleanupService';");
  content = content.replace(/import { insertAuditLog } from "\.\.\/services\/auditLogService";/g, 'import { insertCleanupAuditLog as insertAuditLog } from "../services/exportCleanupService";');
  content = content.replace(/import { insertAuditLog } from '\.\.\/services\/auditLogService';/g, "import { insertCleanupAuditLog as insertAuditLog } from '../services/exportCleanupService';");
  fs.writeFileSync(filePath, content);
}

replaceImport('src/api/routes/emailWebhooks.ts');
replaceImport('src/api/services/cleanupAlertService.ts');
replaceImport('src/api/services/emailWebhookService.ts');
replaceImport('src/api/services/cleanupAlertCommentsService.ts');
replaceImport('src/api/services/cleanupAlertEscalationService.ts');

