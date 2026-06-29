// 学生・教員ダッシュボードがローディング後に正常描画されるか検証
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';
async function loginAs(page, email) {
  const r = await page.request.post(`${BASE}/api/data/auth/login`, { data: { email, password: 'password' }, headers: { 'Content-Type': 'application/json' } });
  const b = await r.json();
  await page.goto(`${BASE}/login`);
  await page.evaluate(({ user, token }) => { localStorage.setItem('user_info', JSON.stringify(user)); localStorage.setItem('auth_token', token); }, { user: b.user, token: b.token });
  return b;
}
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) errs.push(`${r.status()} ${r.url().replace(BASE,'')}`); });

  // student dashboard
  await loginAs(page, 'student@teaching-eval.jp');
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const sRoot = await page.locator('[data-testid="student-dashboard-root"]').count();
  console.log('student dashboard rendered:', sRoot >= 1 ? 'OK' : 'FAIL');

  // teacher dashboard
  await loginAs(page, 'teacher@teaching-eval.jp');
  await page.goto(`${BASE}/teacher-dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const tRoot = await page.locator('[data-testid="teacher-dashboard-root"]').count();
  console.log('teacher dashboard rendered:', tRoot >= 1 ? 'OK' : 'FAIL');

  console.log('4xx/5xx /api:', errs.length ? errs : 'NONE (clean)');
  await browser.close();
})();
