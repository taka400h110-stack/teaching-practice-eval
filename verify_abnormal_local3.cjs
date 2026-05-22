const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  try {
    await page.goto('https://teaching-practice-eval.pages.dev/login');
    await Promise.all([
      page.waitForNavigation(),
      page.click('text=山田 太郎')
    ]);
    
    await page.goto(`https://teaching-practice-eval.pages.dev/evaluations/test-crash-1`);
    await page.waitForTimeout(3000); 
    const content = await page.textContent('body');
    console.log(content.slice(0, 1000));
  } finally {
    await browser.close();
  }
})();
