const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push('PAGE ERROR: ' + error.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('CONSOLE ERROR: ' + msg.text());
    }
  });

  await page.goto('http://localhost:3000/login');
  await page.click('text=システム管理者');
  await page.waitForTimeout(1000);

  // Navigate to cohorts
  console.log('Navigating to cohorts');
  await page.goto('http://localhost:3000/cohorts');
  await page.waitForTimeout(2000);
  
  // click BigFive tab
  try {
    await page.click('text=BigFive分析');
    await page.waitForTimeout(1000);
  } catch(e) {
    console.log('BigFive tab click failed:', e);
  }
  
  console.log('Errors during rendering:', errors);
  const content = await page.content();
  console.log('Content includes BigFive:', content.includes('BigFive'));
  
  await browser.close();
})();
