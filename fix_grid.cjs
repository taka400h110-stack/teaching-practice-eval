const fs = require('fs');
const path = '/home/user/webapp/src/pages/SCATAnalysisPage.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/<Grid size=\{\{xs=\{12\} sm=\{6\}\}\}>/g, '<Grid size={{xs: 12, sm: 6}}>');
content = content.replace(/<Grid size=\{\{xs=\{12\} md=\{6\}\}\}>/g, '<Grid size={{xs: 12, md: 6}}>');
content = content.replace(/<Grid size=\{\{xs=\{12\}\}\}>/g, '<Grid size={{xs: 12}}>');

fs.writeFileSync(path, content);
