const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://teaching-practice-eval.pages.dev');
  await page.waitForTimeout(5000); // Give it plenty of time to load
  
  const content = await page.content();
  console.log("Length of HTML:", content.length);
  console.log("Has 教育実習生:", content.includes('教育実習生'));
  
  // Just print some of the text content to see what's actually rendered
  const text = await page.evaluate(() => document.body.innerText);
  console.log("Page Text:", text.substring(0, 500));
  
  await browser.close();
})();
