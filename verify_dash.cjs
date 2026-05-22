const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('[Login] Navigating to login page...');
  await page.goto('https://teaching-practice-eval.pages.dev/login');
  
  await page.waitForSelector('text=山田 太郎', { timeout: 10000 });
  await page.click('text=山田 太郎');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(5000);

  const innerText = await page.evaluate(() => document.body.innerText);
  console.log(`[UI] Dashboard: ${innerText.substring(0, 500)}`);
  
  await page.screenshot({ path: `/mnt/aidrive/dash.png`, fullPage: true });

  await browser.close();
})();
