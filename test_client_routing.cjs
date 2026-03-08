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
  await page.click('text=評価者');
  await page.waitForTimeout(1000);

  // Click on "評価一覧" menu
  await page.click('text=評価一覧');
  await page.waitForTimeout(1000);
  
  // Click on "人間評価" for the first item
  console.log('Navigating to human eval via click');
  try {
    const buttons = await page.$$('text=人間評価');
    if (buttons.length > 0) {
      await buttons[0].click();
      await page.waitForTimeout(2000);
    } else {
      console.log('No 人間評価 button found');
    }
  } catch (e) {
    console.error('Click failed:', e);
  }
  
  console.log('Errors during client routing:', errors);
  
  await browser.close();
})();
