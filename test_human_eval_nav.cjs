const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('pageerror', error => {
    console.error(`Page Error: ${error.message}`);
  });

  await page.goto(`http://localhost:3000/evaluations/human`, { waitUntil: 'networkidle', timeout: 5000 });
  await page.waitForTimeout(2000); 

  console.log("HTML:", await page.$eval('#root', el => el.innerHTML).catch(() => 'No root'));

  await browser.close();
})();
