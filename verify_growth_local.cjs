const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    console.log('Logging in...');
    await page.goto('https://teaching-practice-eval.pages.dev/login');
    await page.click('text=山田 太郎');
    await page.waitForSelector('text=山田 太郎', { timeout: 15000 });
    
    console.log('Navigating to growth page...');
    await page.goto('https://teaching-practice-eval.pages.dev/growth');
    await page.waitForTimeout(3000);
    
    const content = await page.textContent('body');
    console.log("Has render error:", content.includes('Application Error') || content.includes('cannot render'));
    console.log("Has missing data alert:", content.includes('成長データがありません'));
    
    await page.screenshot({ path: 'growth_fix.png', fullPage: true });
    console.log("Screenshot saved to growth_fix.png");

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
})();
