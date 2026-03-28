const fs = require('fs');
const path = require('path');

const packageFile = path.join(__dirname, '../package.json');
let content = fs.readFileSync(packageFile, 'utf8');
const pkg = JSON.parse(content);

pkg.scripts['test:e2e'] = 'playwright test';
pkg.scripts['test:e2e:headed'] = 'playwright test --headed';
pkg.scripts['test'] = 'playwright test'; // 暫定

fs.writeFileSync(packageFile, JSON.stringify(pkg, null, 2));
console.log('Updated package.json scripts');
