const fs = require('fs');

let content = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');

content = content.replace('const json = await res.json();', 'const json = await res.json() as any;');

fs.writeFileSync('src/pages/ComparisonPage.tsx', content);
