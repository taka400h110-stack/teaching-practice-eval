const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://teaching-practice-eval.pages.dev/login');
  
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });
  await page.fill('input[type="email"]', 'student@teaching-eval.jp');
  await page.fill('input[type="password"]', 'password');
  await page.click('button:has-text("ログイン")');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  const jid = 'test-crash-2';
  await page.goto(`https://teaching-practice-eval.pages.dev/journals/${jid}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const innerText = await page.evaluate(() => document.body.innerText);
  console.log(`[UI] test-crash-2 Journal detail: ${innerText.substring(0, 500)}`);
  
  await browser.close();
})();
