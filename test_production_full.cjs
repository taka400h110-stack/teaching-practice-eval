const { chromium } = require('playwright');

async function testRole(browser, email, roleName) {
  console.log(`\n=== Testing Role: ${roleName} (${email}) ===`);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  try {
    await page.goto('https://teaching-practice-eval.pages.dev/login');
    await page.waitForTimeout(1000);
    
    // Login
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'password');
    await page.click('button:has-text("ログイン")');
    await page.waitForTimeout(2000);

    // Get current URL and page text
    const url = page.url();
    console.log(`- Navigated to: ${url}`);
    let content = await page.content();
    
    // Check if charts exist
    const hasRecharts = content.includes('recharts-wrapper') || content.includes('recharts-surface');
    console.log(`- Dashboard has Recharts: ${hasRecharts}`);

    // If student, check journal
    if (roleName === 'Student') {
      await page.click('text=日誌一覧');
      await page.waitForTimeout(2000);
      console.log(`- Journals URL: ${page.url()}`);
      
      await page.click('text=成長グラフ');
      await page.waitForTimeout(2000);
      console.log(`- Growth URL: ${page.url()}`);
      content = await page.content();
      console.log(`- Growth page has charts: ${content.includes('recharts-wrapper')}`);
    }

    // If evaluator, check human eval
    if (roleName === 'Evaluator') {
      await page.click('text=評価一覧');
      await page.waitForTimeout(2000);
      
      const evalBtns = await page.$$('text=人間評価');
      if (evalBtns.length > 0) {
        await evalBtns[0].click();
        await page.waitForTimeout(2000);
        console.log(`- Human Eval URL: ${page.url()}`);
        content = await page.content();
        console.log(`- Human Eval page rendered properly: ${content.includes('人間評価入力') && !content.includes('取得に失敗しました')}`);
      }
    }

    // If admin, check cohorts and BigFive
    if (roleName === 'Admin') {
      await page.click('text=コーホート管理');
      await page.waitForTimeout(2000);
      console.log(`- Cohorts URL: ${page.url()}`);
      
      const tabs = await page.$$('text=BigFive分析');
      if (tabs.length > 0) {
        await tabs[0].click();
        await page.waitForTimeout(2000);
        content = await page.content();
        console.log(`- BigFive tab has charts: ${content.includes('recharts-wrapper')}`);
      }
    }

    console.log(`- Errors encountered: ${errors.length > 0 ? errors.join(', ') : 'None'}`);
  } catch (e) {
    console.log(`- Exception during test: ${e.message}`);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  await testRole(browser, 'student@teaching-eval.jp', 'Student');
  await testRole(browser, 'teacher@teaching-eval.jp', 'Teacher');
  await testRole(browser, 'evaluator@teaching-eval.jp', 'Evaluator');
  await testRole(browser, 'admin@teaching-eval.jp', 'Admin');
  
  await browser.close();
})();
