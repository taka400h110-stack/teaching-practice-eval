const fs = require('fs');
const file = '/home/user/webapp/src/pages/DashboardPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/latest\[f\]\.toFixed/g, '(latest[f] || 0).toFixed');
code = code.replace(/latest\.total\.toFixed/g, '(latest.total || 0).toFixed');
code = code.replace(/prev\.total\.toFixed/g, '(prev.total || 0).toFixed');
code = code.replace(/total\)\.toFixed/g, 'total || 0).toFixed');
code = code.replace(/total\}\)\.toFixed/g, 'total || 0}).toFixed');

fs.writeFileSync(file, code);
console.log('Fixed DashboardPage.tsx');
