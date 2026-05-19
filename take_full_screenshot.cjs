const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Set a very tall viewport to ensure everything is rendered without scrolling issues
  const context = await browser.newContext({ viewport: { width: 1280, height: 4000 } });
  const page = await context.newPage();
  
  // Navigate to onboarding page
  await page.goto('http://localhost:3000/onboarding');
  
  // Wait for React to render completely
  await page.waitForTimeout(4000);
  
  // Take a full page screenshot
  await page.screenshot({ path: '/mnt/aidrive/BigFive_Screenshot_Full.png', fullPage: true });
  await page.screenshot({ path: '/home/user/webapp/BigFive_Screenshot_Full.png', fullPage: true });
  
  await browser.close();
  console.log('Screenshot saved to /mnt/aidrive/BigFive_Screenshot_Full.png');
})();
