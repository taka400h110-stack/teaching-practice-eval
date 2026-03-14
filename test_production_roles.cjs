const { chromium } = require('playwright');

async function testRole(browser, roleText) {
  console.log(`\n=== Testing Role: ${roleText} ===`);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon')) {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  try {
    // Navigate and Login
    await page.goto('https://teaching-practice-eval.pages.dev/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.click(`text=${roleText}`);
    await page.waitForTimeout(2000);

    const url = page.url();
    console.log(`- Navigated to: ${url}`);
    
    // Test Dashboard Charts
    let content = await page.content();
    const hasRecharts = content.includes('recharts-wrapper') || content.includes('recharts-surface');
    console.log(`- Dashboard has Recharts: ${hasRecharts}`);

    // If student, check specific features
    if (roleText === '教育実習生') {
      await page.click('text=日誌一覧');
      await page.waitForTimeout(2000);
      console.log(`- Journals URL: ${page.url()}`);
      content = await page.content();
      console.log(`- Journals has Table: ${content.includes('MuiTable-root')}`);
      
      await page.click('text=成長グラフ');
      await page.waitForTimeout(2000);
      console.log(`- Growth URL: ${page.url()}`);
      content = await page.content();
      console.log(`- Growth has Charts: ${content.includes('recharts-wrapper')}`);
    }

    // If evaluator, check human evaluation
    if (roleText === '評価者') {
      await page.click('text=評価一覧');
      await page.waitForTimeout(2000);
      console.log(`- Evaluations URL: ${page.url()}`);
      
      const evalBtns = await page.$$('text=人間評価');
      if (evalBtns.length > 0) {
        await evalBtns[0].click();
        await page.waitForTimeout(2000);
        console.log(`- Human Eval URL: ${page.url()}`);
        content = await page.content();
        console.log(`- Human Eval page rendered: ${content.includes('人間評価入力')}`);
        console.log(`- Human Eval no errors: ${!content.includes('取得に失敗')}`);
      }
    }

    // If admin, check cohorts
    if (roleText === 'システム管理者') {
      await page.click('text=コーホート管理');
      await page.waitForTimeout(2000);
      console.log(`- Cohorts URL: ${page.url()}`);
      
      // Try to click BigFive tab
      try {
        await page.click('text=BigFive分析');
        await page.waitForTimeout(1000);
        content = await page.content();
        console.log(`- BigFive tab has Charts: ${content.includes('recharts-wrapper')}`);
      } catch (e) {
        console.log(`- Could not click BigFive tab`);
      }
    }

    console.log(`- Errors encountered: ${errors.length > 0 ? errors.join(' | ') : 'None'}`);
  } catch (e) {
    console.log(`- Exception during test: ${e.message}`);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  await testRole(browser, '教育実習生');
  await testRole(browser, '評価者');
  await testRole(browser, 'システム管理者');
  
  await browser.close();
})();
