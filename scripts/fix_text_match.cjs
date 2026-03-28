const fs = require('fs');

let f2 = '/home/user/webapp/tests/e2e/export-filter-audit.spec.ts';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/locator\('text=信頼性'\)/g, "getByText(/信頼性/)");
fs.writeFileSync(f2, c2);
console.log('Fixed text match');
