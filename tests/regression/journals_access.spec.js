const { chromium } = require('/home/user/webapp/node_modules/playwright');
const BASE = "https://teaching-practice-eval.pages.dev";

async function login(page, email) {
  for (let i = 0; i < 5; i++) {
    try { await page.goto(`${BASE}/login`, { waitUntil:'domcontentloaded', timeout:20000 }); } catch { continue; }
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"]').click();
    try { await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 10000 }); return true; }
    catch { await page.waitForTimeout(1500); }
  }
}

(async () => {
  const browser = await chromium.launch();
  // student のリグレッション確認
  for (const email of ['student@teaching-eval.jp', 'admin@teaching-eval.jp', 'evaluator@teaching-eval.jp']) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, email);
    await page.goto(`${BASE}/journals`, { waitUntil:'networkidle', timeout:30000 });
    await page.waitForTimeout(2500);
    const body = (await page.locator('body').textContent()).replace(/\s+/g,' ');
    const unauth = body.includes('権限がありません');
    const cards = await page.locator('[data-testid="journal-list-root"] .MuiCard-root').count();
    console.log(`${email}: ${unauth?'⚠️unauthorized':`Card数 ${cards}`}`);
    await ctx.close();
  }
  await browser.close();
})();
