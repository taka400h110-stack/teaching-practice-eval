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
  return false;
}

(async () => {
  // Get a real journal id via API first
  const r = await fetch(`${BASE}/api/data/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email:'admin@teaching-eval.jp', password:'password'})
  });
  const { token } = await r.json();
  const jr = await fetch(`${BASE}/api/data/journals`, { headers:{Authorization:`Bearer ${token}`} });
  const { journals } = await jr.json();
  // Pick one with non-draft status
  const target = journals.find(j => j.status !== 'draft');
  console.log('Target journal id:', target.id, 'status:', target.status);

  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(`PAGEERROR: ${e.message.slice(0,200)}`));
  page.on('console', m => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text().slice(0,200)}`); });

  const ok = await loginWithRetry(page, 'admin@teaching-eval.jp');
  console.log('Login OK:', ok);

  const routes = [
    `/research/journals/${target.id}/scat`,
    `/research/journals/${target.id}/ism`,
    `/research/journals/${target.id}/sp-table`,
    `/research/journals/${target.id}/transmission`,
  ];

  for (const p of routes) {
    errors.length = 0;
    try {
      await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(4000);
    } catch (e) {
      console.log(`\n[${p}] nav err: ${e.message.slice(0,80)}`);
      continue;
    }
    const buttons = await page.locator('button').count();
    const charts = await page.locator('.recharts-responsive-container,canvas,svg.recharts-surface').count();
    const tables = await page.locator('table').count();
    const tableRows = await page.locator('table tbody tr').count();
    const tabs = await page.locator('[role="tab"]').count();
    const inputs = await page.locator('input:not([type="hidden"]),textarea').count();
    const body = (await page.locator('body').textContent()).replace(/\s+/g,' ').slice(0, 200);
    console.log(`\n[${p}]`);
    console.log(`  buttons:${buttons} charts:${charts} tables:${tables} rows:${tableRows} tabs:${tabs} inputs:${inputs}`);
    console.log(`  preview: ${body.slice(0,160)}`);
    if (errors.length) console.log(`  ❌ERR: ${errors.slice(0,2).map(e=>e.slice(0,150)).join(' | ')}`);
  }

  await browser.close();
})();
