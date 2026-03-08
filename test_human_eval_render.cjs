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
  await page.click('text=評価者');
  await page.waitForTimeout(1000);

  console.log('Navigating to /evaluations/1/human');
  await page.goto('http://localhost:3000/evaluations/1/human');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/home/user/webapp/human_eval.png' });
  const content = await page.content();
  console.log('Page length:', content.length);
  console.log('Contains 人間評価入力:', content.includes('人間評価入力'));
  
  await browser.close();
})();
