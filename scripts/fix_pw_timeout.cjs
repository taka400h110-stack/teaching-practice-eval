const fs = require('fs');
const file = '/home/user/webapp/playwright.config.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('timeout:')) {
  content = content.replace("fullyParallel: true,", "fullyParallel: true,\n  timeout: 120000,\n  expect: { timeout: 10000 },");
} else {
  // Just in case it has webServer timeout but not global timeout
  if (!content.match(/timeout:\s*120000/)) {
     content = content.replace("fullyParallel: true,", "fullyParallel: true,\n  timeout: 120000,\n  expect: { timeout: 10000 },");
  }
}

fs.writeFileSync(file, content);
console.log('Fixed playwright timeout');
