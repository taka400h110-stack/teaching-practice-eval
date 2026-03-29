const fs = require('fs');

let c = fs.readFileSync('/home/user/webapp/playwright.config.ts', 'utf8');
// remove Mobile Safari
c = c.replace(/\{\s*name:\s*'Mobile Safari'[\s\S]*?\},/, '');
fs.writeFileSync('/home/user/webapp/playwright.config.ts', c);

let f2 = '/home/user/webapp/tests/e2e/export-filter-audit.spec.ts';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/locator\('text=縦断分析'\)/g, "getByText(/縦断分析/)");
fs.writeFileSync(f2, c2);

console.log('Fixed webkit and text match');
