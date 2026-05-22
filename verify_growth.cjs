const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('[Login] Navigating to login page...');
  await page.goto('https://teaching-practice-eval.pages.dev/login');
  
  await page.waitForSelector('text=山田 太郎', { timeout: 10000 });
  await page.click('text=山田 太郎');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Set up network listener for growth API
  page.on('response', async (response) => {
    if (response.url().includes('/api/data/evaluations') && response.status() === 200) {
      try {
        const json = await response.json();
        console.log(`[Network] Intercepted response for evaluations API`);
        // console.log(JSON.stringify(json).substring(0, 300));
      } catch (e) {}
    }
  });

  page.on('pageerror', err => {
    console.log(`[PageError] ${err.message}`);
  });

  console.log('[Navigate] Going to growth graph...');
  await page.goto(`https://teaching-practice-eval.pages.dev/growth`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  const innerText = await page.evaluate(() => document.body.innerText);
  console.log(`[UI] Growth Page Text: ${innerText.substring(0, 500)}`);
  
  await page.screenshot({ path: `/home/user/webapp/growth_error.png`, fullPage: true });

  await browser.close();
})();
