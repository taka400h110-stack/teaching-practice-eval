const fs = require('fs');

let f1 = '/home/user/webapp/tests/e2e/visual-regression.spec.ts';
let c1 = fs.readFileSync(f1, 'utf8');
c1 = c1.replace(/test\.skip\(\(\{\s*browserName,\s*project\s*\}\)\s*=>\s*project\.name\s*!==\s*'chromium',\s*'Desktop only'\);/g, 
                "test.skip(({ isMobile }) => isMobile, 'Desktop only');");
fs.writeFileSync(f1, c1);

let f2 = '/home/user/webapp/tests/e2e/visual-mobile.spec.ts';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/test\.skip\(\(\{\s*project\s*\}\)\s*=>\s*project\.name\s*===\s*'chromium',\s*'Mobile only'\);/g, 
                "test.skip(({ isMobile }) => !isMobile, 'Mobile only');");
fs.writeFileSync(f2, c2);

console.log('Fixed test skips');
