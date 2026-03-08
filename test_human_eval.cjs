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

  console.log(`Testing /evaluations/1/human...`);
  try {
    await page.goto(`http://localhost:3000/evaluations/1/human`, { waitUntil: 'networkidle', timeout: 5000 });
    await page.waitForTimeout(1000); 
  } catch (e) {
    console.log(`Failed: ${e.message}`);
  }

  await browser.close();
})();
