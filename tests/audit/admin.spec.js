const { chromium } = require('/home/user/webapp/node_modules/playwright');
const BASE = "https://teaching-practice-eval.pages.dev";

const TARGETS = process.argv.slice(2);

async function loginWithRetry(page, email) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch { continue; }
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill('password');
    await page.locator('button[type="submit"]').click();
    try {
      await page.waitForURL(u => !u.toString().includes('/login'), { timeout: 10000 });
      return true;
    } catch {
      console.log(`  retry ${attempt}`);
      await page.waitForTimeout(1500);
    }
  }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text().slice(0,200)}`); });

  const ok = await loginWithRetry(page, 'admin@teaching-eval.jp');
  console.log('Login OK:', ok, 'URL:', page.url());

  for (const p of TARGETS) {
    errors.length = 0;
    try {
      await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2500);
    } catch (e) {
      console.log(`\n[${p}] navigation error: ${e.message.slice(0,60)}`);
      continue;
    }
    const buttons = await page.locator('button').count();
    const charts = await page.locator('.recharts-responsive-container,canvas,svg.recharts-surface').count();
    const tableRows = await page.locator('table tbody tr').count();
    const tabs = await page.locator('[role="tab"]').count();
    const inputs = await page.locator('input:not([type="hidden"]),textarea,[role="slider"]').count();
    const body = (await page.locator('body').textContent().catch(()=>'')).replace(/\s+/g,' ');
    const isLoginRedirect = body.includes('AI-Supported') && body.includes('カードをクリック');
    const isUnauthorized = body.includes('権限がありません') || body.includes('unauthorized');
    console.log(`\n[${p}]`);
    if (isLoginRedirect) console.log('  ⚠️ login画面にリダイレクト');
    else if (isUnauthorized) console.log('  ⚠️ /unauthorized');
    else console.log(`  buttons:${buttons} charts:${charts} rows:${tableRows} tabs:${tabs} inputs:${inputs}`);
    if (errors.length) console.log(`  ❌ERR: ${errors[0].slice(0,180)}`);
  }
  await browser.close();
})();
