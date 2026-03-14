const { chromium } = require('playwright');

async function testRole(browser, roleName, clickText) {
  console.log(`\n=== Testing Role: ${roleName} ===`);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Failed to load resource')) {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  try {
    // Navigate and Login
    await page.goto('https://teaching-practice-eval.pages.dev/login');
    await page.waitForTimeout(2000);
    
    // Find the card containing the text and click it
    const cards = await page.$$('.MuiCardActionArea-root');
    let clicked = false;
    for (const card of cards) {
      const text = await card.innerText();
      if (text.includes(clickText)) {
        await card.click();
        clicked = true;
        break;
      }
    }
    
    if (!clicked) {
      console.log(`Could not find login card for ${clickText}`);
      return;
    }
    
    await page.waitForTimeout(2000);

    const url = page.url();
    console.log(`- Dashboard URL: ${url}`);
    
    // Test Dashboard Charts
    let content = await page.content();
    const hasRecharts = content.includes('recharts-wrapper') || content.includes('recharts-surface');
    console.log(`- Dashboard has Recharts: ${hasRecharts}`);

    // If student, check specific features
    if (roleName === 'Student') {
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
      
      await page.click('text=実習ルーブリック');
      await page.waitForTimeout(2000);
      console.log(`- Self Eval URL: ${page.url()}`);
      content = await page.content();
      console.log(`- Self Eval loaded: ${content.includes('自己評価')}`);
    }

    // If evaluator, check human evaluation
    if (roleName === 'Evaluator') {
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
      } else {
        console.log(`- No 人間評価 buttons found`);
      }
      
      // Check Reliability
      await page.click('text=信頼性分析');
      await page.waitForTimeout(2000);
      console.log(`- Reliability URL: ${page.url()}`);
      content = await page.content();
      console.log(`- Reliability has Charts: ${content.includes('recharts-wrapper')}`);
    }

    // If admin, check cohorts
    if (roleName === 'Admin') {
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
      
      // Check Statistics
      await page.click('text=統計サマリー');
      await page.waitForTimeout(2000);
      console.log(`- Statistics URL: ${page.url()}`);
      content = await page.content();
      console.log(`- Statistics has Charts: ${content.includes('recharts-wrapper')}`);
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
  
  await testRole(browser, 'Student', '実習生');
  await testRole(browser, 'Evaluator', '評価者');
  await testRole(browser, 'Admin', '管理者');
  
  await browser.close();
})();
