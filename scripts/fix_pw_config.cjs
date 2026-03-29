const fs = require('fs');
let c = fs.readFileSync('/home/user/webapp/playwright.config.ts', 'utf8');
c = c.replace(/\{\s*name:\s*'Mobile Chrome'[\s\S]*?\},[\s\S]*?\}/, "{ name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } }");
fs.writeFileSync('/home/user/webapp/playwright.config.ts', c);
console.log('Fixed playwright config syntax');
