const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push('PAGE ERROR: ' + error.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('CONSOLE ERROR: ' + msg.text());
    }
  });

  console.log("Navigating to production site...");
  await page.goto('https://teaching-practice-eval.pages.dev/login');
  await page.waitForTimeout(2000);
  
  // Login as student
  console.log("Logging in as student...");
  await page.click('text=教育実習生');
  await page.waitForTimeout(2000);

  // Check Dashboard
  console.log("Checking Dashboard...");
  let content = await page.content();
  console.log("- Dashboard loaded:", content.includes('ダッシュボード') || content.includes('進捗'));
  
  // Check for charts/graphs on Dashboard
  const hasRecharts = content.includes('recharts') || content.includes('recharts-wrapper');
  console.log("- Charts rendered (Recharts):", hasRecharts);
  
  // Navigate to Journals
  console.log("Navigating to Journals...");
  await page.click('text=日誌一覧');
  await page.waitForTimeout(2000);
  content = await page.content();
  console.log("- Journals page loaded:", content.includes('日誌') && content.includes('MuiTable-root'));

  // Navigate to Cohorts (requires admin login, let's logout and login as admin)
  console.log("Logging out...");
  await page.click('text=ログアウト');
  await page.waitForTimeout(1000);
  
  console.log("Logging in as admin...");
  await page.click('text=システム管理者');
  await page.waitForTimeout(2000);
  
  console.log("Navigating to Cohorts Management...");
  await page.goto('https://teaching-practice-eval.pages.dev/cohorts');
  await page.waitForTimeout(2000);
  
  content = await page.content();
  console.log("- Cohorts page loaded:", content.includes('コーホート'));
  
  // Click BigFive tab
  console.log("Clicking BigFive tab...");
  try {
    await page.click('text=BigFive分析');
    await page.waitForTimeout(2000);
    content = await page.content();
    console.log("- BigFive charts rendered:", content.includes('recharts') || content.includes('RadarChart'));
  } catch(e) {
    console.log("- Failed to click BigFive tab:", e.message);
  }
  
  console.log("Errors collected:", errors.length > 0 ? errors : "None");
  
  await browser.close();
})();
