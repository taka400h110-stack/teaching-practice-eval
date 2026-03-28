const fs = require('fs');
const path = require('path');

const bannerFile = path.join(__dirname, '../src/components/admin/CleanupFailureAlertBanner.tsx');
let content = fs.readFileSync(bannerFile, 'utf8');

if (!content.includes('ackDeadlineAt')) {
  // Add SLA imports/components if needed or just display chips
  
  const chipImports = `import Chip from '@mui/material/Chip';\nimport WarningIcon from '@mui/icons-material/Warning';`;
  if (!content.includes('import Chip from')) {
    content = content.replace("import Button from '@mui/material/Button';", "import Button from '@mui/material/Button';\n" + chipImports);
  }

  const slaChips = `
            {alert.ackBreached && (
              <Chip size="small" color="error" icon={<WarningIcon />} label="Ack SLA Breached" sx={{ ml: 1 }} />
            )}
            {alert.resolveBreached && (
              <Chip size="small" color="error" icon={<WarningIcon />} label="Resolve SLA Breached" sx={{ ml: 1 }} />
            )}
  `;

  content = content.replace(
    '<Box sx={{ mt: 1 }}>',
    '<Box sx={{ mt: 1 }}>\n' + slaChips
  );

  fs.writeFileSync(bannerFile, content);
  console.log('Updated CleanupFailureAlertBanner.tsx with SLA chips');
} else {
  console.log('SLA chips already in CleanupFailureAlertBanner.tsx');
}
