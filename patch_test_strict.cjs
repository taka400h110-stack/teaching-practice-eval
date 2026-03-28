const fs = require('fs');
const path = require('path');

const testPath = path.join(__dirname, 'tests', 'e2e', 'scat-journal-integration.spec.ts');
let code = fs.readFileSync(testPath, 'utf8');

code = code.replace(/await expect\(page.locator\('text=対象期間'\)\).toBeVisible\(\);/,
  "await expect(page.locator('text=対象期間').first()).toBeVisible();");

code = code.replace(/const canvas = page.locator\('canvas'\);/,
  "const canvas = page.locator('[data-testid=\"network-canvas\"]');");

code = code.replace(/const svg = page.locator\('\.recharts-surface'\);/,
  "const svg = page.locator('.recharts-surface').first();");

fs.writeFileSync(testPath, code);
console.log('Fixed strict mode violations');
