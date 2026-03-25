const fs = require('fs');

const appTsx = 'src/App.tsx';
let content = fs.readFileSync(appTsx, 'utf-8');

content = content.replace(/path="advanced"/, 'path="advanced-analytics"');
content = content.replace(/path="platform"/, 'path="platform-analytics"');

fs.writeFileSync(appTsx, content);
console.log('App.tsx paths updated');
