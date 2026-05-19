const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    await page.goto('https://teaching-practice-eval.pages.dev/login');
    await page.click('text=山田 太郎');
    await page.waitForSelector('text=山田 太郎', { timeout: 15000 });
    
    await page.goto('https://teaching-practice-eval.pages.dev/dashboard');
    await page.waitForTimeout(3000);
    const dashContent = await page.textContent('body');
    console.log("Dash render error:", dashContent.includes('Application Error'));
    await page.screenshot({ path: 'dash_fix.png', fullPage: true });
    
    await page.click('text=ログアウト');
    await page.waitForSelector('text=ログイン');
    await page.click('text=田中 管理者');
    await page.waitForSelector('text=システム管理者', { timeout: 15000 });
    
    await page.goto('https://teaching-practice-eval.pages.dev/statistics');
    await page.waitForTimeout(3000);
    const statsContent = await page.textContent('body');
    console.log("Stats render error:", statsContent.includes('Application Error'));
    await page.screenshot({ path: 'stats_fix.png', fullPage: true });

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();
