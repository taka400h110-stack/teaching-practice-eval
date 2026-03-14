const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('https://teaching-practice-eval.pages.dev/login');
  await page.waitForTimeout(5000); // 5 seconds wait
  
  const content = await page.content();
  console.log("HTML length:", content.length);
  
  // Save a screenshot to see what's rendering
  await page.screenshot({ path: '/home/user/webapp/login_screen.png' });
  
  // Find all cards or buttons we can click
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, .MuiCardActionArea-root')).map(el => ({
      text: el.innerText.substring(0, 30).replace(/\n/g, ' '),
      tag: el.tagName
    }));
  });
  console.log("Clickable elements found:", buttons);
  
  await browser.close();
})();
