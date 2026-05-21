const { chromium } = require('/home/user/webapp/node_modules/playwright');
const BASE = "https://teaching-practice-eval.pages.dev";

async function loginWithRetry(page, email) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try { await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 }); } catch { continue; }
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"]').click();
    try { await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 10000 }); return true; }
    catch { await page.waitForTimeout(1500); }
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  page.on('response', async (resp) => {
    if (resp.url().includes('/api/data/journals') && !resp.url().includes('/journals/')) {
      try {
        const j = await resp.json();
        console.log(`  [NET ${resp.status()}] journals.length=${(j.journals||[]).length}`);
      } catch {}
    }
  });
  await loginWithRetry(page, 'researcher@teaching-eval.jp');

  await page.goto(`${BASE}/journals`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(4000);
  const cards = await page.locator('[data-testid="journal-list-root"] .MuiCard-root').count();
  const cardListItems = await page.locator('[data-testid="journal-list-root"] .MuiCard-root > .MuiCardContent-root').count();
  const titles = await page.locator('h6').allTextContents();
  const noData = await page.locator('text=提出された日誌がまだありません').count();
  console.log(`\nMuiCard count: ${cards}`);
  console.log(`Card content count: ${cardListItems}`);
  console.log(`H6 titles (first 5): ${JSON.stringify(titles.slice(0,5))}`);
  console.log(`"No data" msg present: ${noData}`);

  await browser.close();
})();
