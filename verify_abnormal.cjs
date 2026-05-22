const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://teaching-practice-eval.pages.dev/login');
  try {
    await page.waitForSelector('text=山田 太郎', { timeout: 10000 });
    await page.click('text=山田 太郎');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('[Login] Success');
  } catch(e) { console.log('[Login] Failed:', e.message); }

  const journals = ['test-crash-1', 'test-crash-2'];
  for (const jid of journals) {
    console.log(`\nNavigating to Journal: ${jid}`);
    await page.goto(`https://teaching-practice-eval.pages.dev/journals/${jid}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `/home/user/webapp/abnormal_${jid}.png`, fullPage: true });
  }

  await browser.close();
})();
