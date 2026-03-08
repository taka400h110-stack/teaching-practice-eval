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
  await page.click('text=評価者');
  await page.waitForTimeout(1000);

  // Click on "評価一覧" menu
  await page.click('text=評価一覧');
  await page.waitForTimeout(1000);
  
  console.log('Navigating to human eval via click');
  const buttons = await page.$$('text=人間評価');
  if (buttons.length > 0) {
    await buttons[0].click();
    await page.waitForTimeout(2000);
  } else {
    console.log('No 人間評価 button found');
  }
  
  console.log('Errors during client routing:', errors);
  const content = await page.content();
  console.log('Content includes 人間評価入力:', content.includes('人間評価入力'));
  await page.screenshot({ path: '/home/user/webapp/human_eval_client.png' });
  
  await browser.close();
})();
