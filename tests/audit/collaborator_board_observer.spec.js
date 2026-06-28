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

  // 重要ページ + researcherにあるが collaborator/board_observer にないページの確認
  const sharedPages = ['/admin', '/evaluations', '/cohorts', '/longitudinal', '/scat', '/scat-batch', '/statistics', '/advanced-analytics', '/exports', '/journals'];
  // researcher限定 - collaborator/board_observer は /unauthorized 期待
  const restricted = ['/teacher-dashboard', '/platform-analytics'];

  for (const email of ['collaborator@teaching-eval.jp', 'observer@teaching-eval.jp']) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await login(page, email);
    console.log(`\n=== ${email} ===`);
    console.log(`Home URL: ${page.url()}`);

    // Sidebar count
    const sidebarItems = await page.locator('nav a, [role="navigation"] a, .MuiDrawer-root a').count();
    const roleLabel = await page.locator('header').textContent().catch(()=>'').then(t => t.replace(/\s+/g,' ').slice(0,100));
    console.log(`  Sidebar nav links: ${sidebarItems}`);
    console.log(`  Header text: ${roleLabel}`);

    // Test shared pages
    let okCount = 0, errCount = 0;
    for (const p of sharedPages) {
      try {
        await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2500);
        const body = (await page.locator('body').textContent()).replace(/\s+/g,' ');
        const unauth = body.includes('権限がありません') || body.includes('unauthorized');
        if (unauth) { console.log(`  [${p}] ⚠️ unauthorized`); errCount++; }
        else { okCount++; }
      } catch (e) {
        console.log(`  [${p}] NAV_ERR`);
        errCount++;
      }
    }
    console.log(`  Shared pages: ${okCount}/${sharedPages.length} OK`);

    // Test restricted pages (期待: unauthorized)
    for (const p of restricted) {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2500);
      const body = (await page.locator('body').textContent()).replace(/\s+/g,' ');
      const unauth = body.includes('権限がありません') || body.includes('unauthorized') || page.url().includes('/unauthorized');
      console.log(`  [${p}] (researcher限定) ${unauth ? '✅ 期待通りunauthorized' : '🔴 アクセスできてしまっている'}`);
    }
    await ctx.close();
  }
  await browser.close();
})();
