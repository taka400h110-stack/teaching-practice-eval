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

  await page.goto(`http://localhost:3000/evaluations/1/human`, { waitUntil: 'networkidle', timeout: 5000 });
  await page.waitForTimeout(2000); 

  const html = await page.content();
  console.log("HTML length:", html.length);
  if (html.includes("人間評価入力")) {
    console.log("Page rendered successfully");
  } else {
    console.log("Page did not render successfully");
  }

  await browser.close();
})();
