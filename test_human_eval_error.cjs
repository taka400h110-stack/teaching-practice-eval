const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000/login');
  
  // Login using the generic way or just find the evaluator button
  await page.click('text=評価者');
  await page.waitForTimeout(1000);

  console.log('Navigating to /evaluations/1/human');
  await page.goto('http://localhost:3000/evaluations/1/human');
  await page.waitForTimeout(2000);
  
  console.log('Errors:', errors);
  
  await browser.close();
})();
