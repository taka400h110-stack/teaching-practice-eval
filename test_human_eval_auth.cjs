const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', error => {
    console.error(`Page Error: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`Console Error: ${msg.text()}`);
    }
  });

  // Login first
  await page.goto(`http://localhost:3000/login`, { waitUntil: 'networkidle' });
  
  // Wait for login page to load, click evaluator
  await page.click('text=小林 評価者');
  await page.waitForTimeout(1000);
  
  console.log("Navigating to human eval...");
  await page.goto(`http://localhost:3000/evaluations/1/human`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); 

  const html = await page.content();
  console.log("Root element contains Error:", html.includes('Error'));

  await browser.close();
})();
