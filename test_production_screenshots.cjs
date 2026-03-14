const { chromium } = require('playwright');
const fs = require('fs');

async function loginAndScreenshot(browser, clickText, roleName, paths) {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto('https://teaching-practice-eval.pages.dev/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Login
    const cards = await page.$$('.MuiCardActionArea-root');
    for (const card of cards) {
      const text = await card.innerText();
      if (text.includes(clickText)) {
        await card.click();
        break;
      }
    }
    await page.waitForTimeout(2000);
    
    // Take screenshot of Dashboard
    await page.screenshot({ path: `/home/user/webapp/prod_${roleName}_dashboard.png`, fullPage: true });

    // Navigate to paths
    for (const p of paths) {
      if (p.click) {
        try {
          await page.click(`text=${p.click}`);
          await page.waitForTimeout(2000);
          await page.screenshot({ path: `/home/user/webapp/prod_${roleName}_${p.name}.png`, fullPage: true });
        } catch(e) {
          console.log(`Failed to click ${p.click}`);
        }
      } else if (p.url) {
        await page.goto(`https://teaching-practice-eval.pages.dev${p.url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: `/home/user/webapp/prod_${roleName}_${p.name}.png`, fullPage: true });
      }
    }
  } catch (e) {
    console.log(`Error testing ${roleName}:`, e.message);
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Student
  await loginAndScreenshot(browser, '実習生', 'student', [
    { click: '日誌一覧', name: 'journals' },
    { click: '成長グラフ', name: 'growth' },
    { url: '/self-evaluation', name: 'self_eval' }
  ]);
  
  // Evaluator
  await loginAndScreenshot(browser, '評価者', 'evaluator', [
    { click: '評価一覧', name: 'evaluations' },
    { url: '/evaluations/journal-001/human', name: 'human_eval' },
    { click: '信頼性分析', name: 'reliability' }
  ]);
  
  // Admin
  await loginAndScreenshot(browser, '管理者', 'admin', [
    { click: 'コーホート管理', name: 'cohorts' },
    { click: '統計サマリー', name: 'statistics' }, // "統計サマリー" might not exist, maybe "全体統計"?
    { url: '/statistics', name: 'statistics_url' }
  ]);
  
  await browser.close();
})();
