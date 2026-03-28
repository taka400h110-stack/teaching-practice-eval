const fs = require('fs');
let path = '/home/user/webapp/src/components/exports/ExportRequestDetailDrawer.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace the Grid import and usages
content = content.replace(/import \{([^}]+)Grid([^}]+)\} from '@mui\/material';/, "import { $1 $2 } from '@mui/material';");
content = content.replace(/<Grid container spacing=\{2\}>/g, '<Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>');
content = content.replace(/<\/Grid>/g, '</Box>');
content = content.replace(/<Grid xs=\{12\} sm=\{6\} as="div">/g, '<Box>');
fs.writeFileSync(path, content);
