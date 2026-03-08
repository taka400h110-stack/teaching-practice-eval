const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('pageerror', error => {
    console.error('PAGE_ERROR:', error);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('CONSOLE_ERROR:', msg.text());
    }
  });

  await page.goto('http://localhost:3000/login');
  await page.click('text=評価者');
  await page.waitForTimeout(500);

  // Navigate directly
  await page.goto('http://localhost:3000/evaluations');
  await page.waitForTimeout(500);

  console.log('Clicking 人間評価');
  const btns = await page.$$('text=人間評価');
  for (const btn of btns) {
    try {
      await btn.click();
      await page.waitForTimeout(1000);
      const url = page.url();
      console.log('Navigated to:', url);
      const content = await page.content();
      console.log('Length:', content.length);
      break;
    } catch(e) {}
  }
  
  await browser.close();
})();
