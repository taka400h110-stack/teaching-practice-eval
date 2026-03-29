const fs = require('fs');
let path = '/home/user/webapp/src/components/exports/ExportRequestDetailDrawer.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('Divider,  , Paper', 'Divider, Paper');
fs.writeFileSync(path, content);
