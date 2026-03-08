const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  await page.click('text=評価者');
  await page.waitForTimeout(1000);

  await page.goto('http://localhost:3000/evaluations/j1/human');
  await page.waitForTimeout(2000);
  
  const html = await page.content();
  console.log("Has Alert?", html.includes('日誌の取得に失敗しました'));
  console.log("Has Form?", html.includes('評価を保存'));
  console.log("Has CircularProgress?", html.includes('MuiCircularProgress-root'));
  
  await browser.close();
})();
