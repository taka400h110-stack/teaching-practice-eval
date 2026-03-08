const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('pageerror', error => {
    console.error('Page error:', error);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Console error:', msg.text());
    }
  });

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'evaluator@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);

  console.log('Navigating to /evaluations/1/human');
  await page.goto('http://localhost:3000/evaluations/1/human');
  await page.waitForTimeout(2000);
  
  const content = await page.content();
  console.log('Page length:', content.length);
  console.log('Is blank?', content.length < 1000);
  
  await browser.close();
})();
