/**
 * verify_rbac_chat.cjs
 * チャット関連ページのUI RBAC検証（許可外ロールが弾かれるか）。
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const ACCOUNTS = {
  student: 'student@teaching-eval.jp',
  univ_teacher: 'teacher@teaching-eval.jp',
  evaluator: 'evaluator@teaching-eval.jp',
};

// [path, {role: expectAllowed}]
const CASES = [
  ['/chat', { student: true, univ_teacher: false, evaluator: false }],
  ['/student-chat-logs', { student: false, univ_teacher: true, evaluator: false }],
];

async function login(request, email) {
  const res = await request.post(`${BASE}/api/data/auth/login`, {
    data: { email, password: 'password' }, headers: { 'Content-Type': 'application/json' },
  });
  const j = await res.json();
  if (!j.token) throw new Error('login failed ' + email);
  return { token: j.token, user: j.user };
}

(async () => {
  const browser = await chromium.launch();
  let fails = 0;
  for (const [role, email] of Object.entries(ACCOUNTS)) {
    const apiCtx = await browser.newContext();
    const s = await login(apiCtx.request, email);
    await apiCtx.close();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript((sess) => {
      const u = JSON.stringify(sess.user);
      localStorage.setItem('token', sess.token);
      localStorage.setItem('auth_token', sess.token);
      localStorage.setItem('user', u);
      localStorage.setItem('user_info', u);
      localStorage.setItem(`onboarding_done_${sess.user.id}`, 'true');
    }, s);
    const page = await ctx.newPage();
    for (const [path, matrix] of CASES) {
      if (!(role in matrix)) continue;
      const expectAllowed = matrix[role];
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1000);
      const url = page.url();
      const body = await page.locator('body').innerText().catch(() => '');
      const blocked = /\/unauthorized|\/login/.test(url) || /アクセス権限がありません|403/.test(body) || !url.includes(path);
      const allowed = !blocked;
      const ok = allowed === expectAllowed;
      console.log(`${ok ? '✅' : '❌'} [${role}] ${path} expect=${expectAllowed ? 'allow' : 'deny'} actual=${allowed ? 'allow' : 'deny'} (url=${url.replace(BASE, '')})`);
      if (!ok) fails++;
    }
    await ctx.close();
  }
  await browser.close();
  console.log(fails === 0 ? '✅ RBAC ALL CORRECT' : `❌ ${fails} RBAC failure(s)`);
  process.exit(fails === 0 ? 0 : 1);
})();
