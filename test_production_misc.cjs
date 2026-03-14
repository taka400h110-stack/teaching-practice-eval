const { chromium } = require('playwright');
const fs = require('fs');

async function testScreenshots(browser, clickText, roleName, paths) {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    await page.goto('https://teaching-practice-eval.pages.dev/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    
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

    for (const p of paths) {
      if (p.click) {
        try {
          await page.click(`text=${p.click}`);
          await page.waitForTimeout(2000);
          await page.screenshot({ path: `/home/user/webapp/prod_${roleName}_${p.name}.png`, fullPage: true });
        } catch(e) {}
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
  
  // Teacher
  await testScreenshots(browser, '大学教員', 'teacher', [
    { click: '教員ダッシュボード', name: 'dashboard' }
  ]);
  
  // Researcher
  await testScreenshots(browser, '研究者', 'researcher', [
    { click: 'AI vs 人間比較', name: 'comparison' },
    { click: '縦断分析', name: 'longitudinal' },
    { click: 'SCAT 質的分析', name: 'scat' }
  ]);
  
  await browser.close();
})();
