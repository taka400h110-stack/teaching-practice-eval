// オンボーディング完了済みのユーザーが再ログインしたとき、
// /onboarding に強制リダイレクトされず /dashboard に直行するか確認
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n=== 学生 2回目ログイン (オンボーディング済み) ===\n');

  // 事前に onboarding_done_user-001 を仕込んでおく
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('onboarding_done_user-001', 'true');
  });

  await page.locator('input[name="email"]').fill('student@teaching-eval.jp');
  await page.locator('input[name="password"]').fill('password');
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const r = await page.evaluate(() => ({
    url: location.pathname,
    pendingOnboarding: localStorage.getItem('pending_onboarding'),
    onboardingDone: localStorage.getItem('onboarding_done_user-001'),
  }));

  console.log(`URL: ${r.url} (期待: /dashboard)`);
  console.log(`pending_onboarding: ${r.pendingOnboarding || '(なし ✅)'}`);
  console.log(`onboarding_done_user-001: ${r.onboardingDone}`);
  console.log(`判定: ${r.url === '/dashboard' && r.pendingOnboarding !== 'true' ? '✅ OK' : '❌ NG'}`);

  await context.close();
  await browser.close();
})();
