const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/types/adminAlerts.ts');
let content = fs.readFileSync(filePath, 'utf8');

if (!content.includes('assigneeUserId: string | null')) {
  content = content.replace(
    'note: string | null;',
    'note: string | null;\n  assigneeUserId: string | null;\n  resolvedAt: string | null;\n  lastCommentedAt: string | null;\n  commentCount?: number;'
  );
  fs.writeFileSync(filePath, content);
  console.log('Updated AlertAcknowledgment type');
}

// Ensure the UI types for Escalations exist
if (!content.includes('export type CleanupAlertEscalation')) {
  content += `\nexport type CleanupAlertEscalation = {
  id: string;
  fingerprint: string;
  level: number;
  status: "active" | "resolved" | "cancelled";
  triggered_at: string;
  resolved_at: string | null;
  note: string | null;
};\n`;
  fs.writeFileSync(filePath, content);
  console.log('Added CleanupAlertEscalation type');
}

