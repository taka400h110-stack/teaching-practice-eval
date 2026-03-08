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

  console.log("Logging in...");
  await page.goto(`http://localhost:3000/login`, { waitUntil: 'networkidle' });
  await page.click('text=小林 評価者');
  await page.waitForTimeout(1000);
  
  console.log("Navigating to human eval...");
  await page.goto(`http://localhost:3000/evaluations/1/human`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); 

  const html = await page.content();
  console.log("Includes 人間評価入力:", html.includes("人間評価入力"));
  console.log("Length of HTML:", html.length);
  
  if (!html.includes("人間評価入力")) {
    console.log("Page Content Dump:", html.substring(0, 1000));
  }

  await browser.close();
})();
