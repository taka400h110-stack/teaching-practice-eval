const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', error => {
    console.error(`Page Error: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`Console Error: ${msg.text()}`);
    }
  });

  await page.goto(`http://localhost:3000/login`, { waitUntil: 'networkidle' });
  await page.click('text=小林 評価者');
  await page.waitForTimeout(1000);
  
  await page.goto(`http://localhost:3000/evaluations/human`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); 

  const html = await page.content();
  console.log("Includes 人間評価入力:", html.includes("人間評価入力"));
  
  await browser.close();
})();
