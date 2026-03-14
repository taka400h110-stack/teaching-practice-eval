const fs = require('fs');
const file = '/home/user/webapp/src/pages/AdvancedAnalyticsPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace <Grid item xs={12} md={6}> with <Grid size={{xs:12, md:6}}>
content = content.replace(/<Grid\s+item\s+xs=\{12\}\s+md=\{6\}>/g, '<Grid size={{xs: 12, md: 6}}>');
content = content.replace(/<Grid\s+item\s+xs=\{12\}\s+sm=\{4\}>/g, '<Grid size={{xs: 12, sm: 4}}>');

fs.writeFileSync(file, content);
console.log("Fixed Grid in AdvancedAnalyticsPage");
