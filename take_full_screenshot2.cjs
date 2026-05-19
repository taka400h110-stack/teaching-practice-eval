const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Set a normal width but enough height
  const context = await browser.newContext({ viewport: { width: 1280, height: 1080 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/onboarding');
  
  await page.waitForTimeout(3000);
  
  // Make sure all accordions are expanded (they are defaultExpanded, but just in case)
  const buttons = await page.locator('.MuiAccordionSummary-root[aria-expanded="false"]').all();
  for (const btn of buttons) {
    await btn.click();
    await page.waitForTimeout(500);
  }
  
  await page.screenshot({ path: '/home/user/webapp/BigFive_Screenshot_Expanded.png', fullPage: true });
  
  await browser.close();
  console.log('Screenshot saved');
})();
