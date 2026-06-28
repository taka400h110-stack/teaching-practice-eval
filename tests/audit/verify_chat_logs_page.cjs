/**
 * verify_chat_logs_page.cjs
 * 学生別 AI対話ログ閲覧ページの動作確認＋スクリーンショット。
 * 実行: node tests/audit/verify_chat_logs_page.cjs
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

const ACCOUNTS = {
  univ_teacher: 'teacher@teaching-eval.jp',
  researcher: 'researcher@teaching-eval.jp',
};

async function loginAndGetSession(request, email) {
  const res = await request.post(`${BASE}/api/data/auth/login`, {
    data: { email, password: 'password' },
    headers: { 'Content-Type': 'application/json' },
  });
  const j = await res.json();
  if (!j.token) throw new Error('login failed: ' + JSON.stringify(j));
  return { token: j.token, user: j.user };
}

(async () => {
  const browser = await chromium.launch();
  let problems = 0;

  for (const [role, email] of Object.entries(ACCOUNTS)) {
    const apiCtx = await browser.newContext();
    const session = await loginAndGetSession(apiCtx.request, email);
    await apiCtx.close();

    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await ctx.addInitScript((s) => {
      const u = JSON.stringify(s.user);
      localStorage.setItem('token', s.token);
      localStorage.setItem('auth_token', s.token);
      localStorage.setItem('user', u);
      localStorage.setItem('user_info', u);
      localStorage.setItem(`onboarding_done_${s.user.id}`, 'true');
    }, session);

    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e)));

    await page.goto(`${BASE}/student-chat-logs`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const url = page.url();
    if (/\/login|\/unauthorized/.test(url)) {
      console.log(`❌ [${role}] redirected to ${url}`);
      problems++;
      await ctx.close();
      continue;
    }

    // 学生一覧が出ているか
    const studentBtns = await page.locator('.MuiListItemButton-root').count();
    console.log(`[${role}] student/session buttons visible: ${studentBtns}`);

    // 最初の学生をクリック
    await page.locator('.MuiListItemButton-root').first().click().catch(() => {});
    await page.waitForTimeout(700);
    // セッション一覧から最初のセッションをクリック
    const afterStudent = await page.locator('.MuiListItemButton-root').count();
    await page.locator('.MuiListItemButton-root').nth(Math.min(1, afterStudent - 1)).click().catch(() => {});
    await page.waitForTimeout(1200);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const hasConversation = /実習生|AI/.test(bodyText) && bodyText.length > 200;
    console.log(`[${role}] conversation rendered: ${hasConversation} (bodyLen=${bodyText.length})`);

    const shot = `/tmp/student-chat-logs-${role}.png`;
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`[${role}] screenshot -> ${shot}`);

    const realErrors = errors.filter((e) => !/DevTools|favicon|\[vite\]|preload/i.test(e));
    if (realErrors.length) {
      console.log(`⚠️ [${role}] console errors:`, realErrors.slice(0, 5));
      problems++;
    }
    if (!hasConversation || studentBtns === 0) problems++;

    await ctx.close();
  }

  await browser.close();
  console.log(problems === 0 ? '✅ ALL GOOD' : `⚠️ ${problems} problem(s)`);
  process.exit(problems === 0 ? 0 : 1);
})();
