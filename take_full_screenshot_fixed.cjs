const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Set a large viewport
  const context = await browser.newContext({ viewport: { width: 1280, height: 4000 } });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/onboarding');
  
  // Wait for React to render completely
  await page.waitForTimeout(3000);
  
  // Expand all accordions just to be safe
  const buttons = await page.locator('.MuiAccordionSummary-root[aria-expanded="false"]').all();
  for (const btn of buttons) {
    await btn.click();
    await page.waitForTimeout(500);
  }
  
  // Take a full page screenshot
  await page.screenshot({ path: '/home/user/webapp/BigFive_Screenshot_Fixed.png', fullPage: true });
  
  await browser.close();
  console.log('Screenshot saved');
})();
