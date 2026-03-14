const { chromium } = require('playwright');

async function testRole(browser, roleName, clickText, pathsToCheck) {
  console.log(`\n=== Testing Role: ${roleName} (${clickText}) ===`);
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', error => { errors.push(`PAGE ERROR: ${error.message}`); });
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('Failed to load resource')) {
      errors.push(`CONSOLE ERROR: ${msg.text()}`);
    }
  });

  try {
    await page.goto('https://teaching-practice-eval.pages.dev/login');
    await page.waitForTimeout(2000);
    
    // Login
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
    console.log(`- Dashboard URL: ${page.url()}`);
    
    for (const path of pathsToCheck) {
      try {
        await page.click(`text=${path.clickText}`);
        await page.waitForTimeout(2000);
        console.log(`- Clicked '${path.clickText}' -> URL: ${page.url()}`);
        const content = await page.content();
        console.log(`  -> Page length: ${content.length}, Has error text: ${content.includes('エラー') || content.includes('取得に失敗')}`);
        if (path.checkCharts) {
          const hasCharts = content.includes('recharts-wrapper') || content.includes('recharts-surface');
          console.log(`  -> Has Charts (recharts): ${hasCharts}`);
        }
      } catch (e) {
        console.log(`- Failed to click '${path.clickText}'`);
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
  
  // Teacher
  await testRole(browser, 'Teacher', '大学教員', [
    { clickText: '教員ダッシュボード', checkCharts: true },
    { clickText: '学生の成長可視化', checkCharts: true }
  ]);
  
  // Mentor
  await testRole(browser, 'Mentor', '校内指導教員', [
    { clickText: '教員ダッシュボード', checkCharts: true }
  ]);
  
  // Researcher
  await testRole(browser, 'Researcher', '研究者', [
    { clickText: 'AI vs 人間比較', checkCharts: true },
    { clickText: '縦断分析', checkCharts: true },
    { clickText: 'SCAT 質的分析', checkCharts: false }
  ]);
  
  // Collaborator
  await testRole(browser, 'Collaborator', '研究協力者', [
    { clickText: 'コーホート管理', checkCharts: true },
    { clickText: '国際比較データ', checkCharts: true }
  ]);
  
  // Committee
  await testRole(browser, 'Committee', '教育委員会', [
    { clickText: '統計サマリー', checkCharts: true }
  ]);
  
  await browser.close();
})();
