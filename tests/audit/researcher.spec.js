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
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(`PE:${e.message.slice(0,200)}`));
  page.on('console', m => { if (m.type() === 'error') errs.push(`CE:${m.text().slice(0,200)}`); });

  await loginWithRetry(page, 'researcher@teaching-eval.jp');

  // /journals 再検証 + journal詳細
  const targets = ['/journals'];

  // また journal詳細を1件確認するためIDを取得
  const r = await fetch(`${BASE}/api/data/auth/login`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email:'researcher@teaching-eval.jp', password:'password'})
  });
  const tok = (await r.json()).token;
  const jr = await fetch(`${BASE}/api/data/journals`, { headers:{Authorization:`Bearer ${tok}`} });
  const { journals } = await jr.json();
  const sample = journals.find(j => j.status !== 'draft');
  if (sample) targets.push(`/journals/${sample.id}`);

  for (const p of targets) {
    errs.length = 0;
    await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    const body = (await page.locator('body').textContent()).replace(/\s+/g,' ');
    const unauthorized = body.includes('権限がありません') || body.includes('unauthorized');
    const buttons = await page.locator('button').count();
    const rows = await page.locator('table tbody tr').count();
    const charts = await page.locator('.recharts-responsive-container,canvas,svg.recharts-surface').count();
    console.log(`[${p}] ${unauthorized?'⚠️ /unauthorized':`b:${buttons} r:${rows} c:${charts}`}${errs.length?'  ❌'+errs[0].slice(0,140):''}`);
  }

  await browser.close();
})();
