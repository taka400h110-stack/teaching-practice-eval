/**
 * shot_audit.cjs — 主要ページのフルスクショ + 横スクロール(レイアウト溢れ)検出
 * 実行: node tests/audit/shot_audit.cjs
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function login(request, email) {
  const res = await request.post(`${BASE}/api/data/auth/login`, {
    data: { email, password: 'password' }, headers: { 'Content-Type': 'application/json' },
  });
  const j = await res.json();
  if (!j.token) throw new Error('login failed ' + email);
  return { token: j.token, user: j.user };
}

// [role, email, path, label, clicks(optional selector sequence)]
const SHOTS = [
  ['student', 'student@teaching-eval.jp', '/dashboard', 'student-dashboard'],
  ['student', 'student@teaching-eval.jp', '/journal-workflow', 'student-workflow'],
  ['student', 'student@teaching-eval.jp', '/growth', 'student-growth'],
  ['student', 'student@teaching-eval.jp', '/bfi', 'student-bfi'],
  ['student', 'student@teaching-eval.jp', '/chat', 'student-chat'],
  ['univ_teacher', 'teacher@teaching-eval.jp', '/teacher-dashboard', 'teacher-dashboard'],
  ['univ_teacher', 'teacher@teaching-eval.jp', '/statistics', 'teacher-statistics'],
  ['researcher', 'researcher@teaching-eval.jp', '/admin', 'researcher-admin'],
  ['researcher', 'researcher@teaching-eval.jp', '/longitudinal', 'researcher-longitudinal'],
  ['researcher', 'researcher@teaching-eval.jp', '/statistics', 'researcher-stats-corr'],
  ['researcher', 'researcher@teaching-eval.jp', '/student-chat-logs', 'researcher-chatlogs-list'],
  ['admin', 'admin@teaching-eval.jp', '/admin', 'admin-dashboard'],
];

(async () => {
  const browser = await chromium.launch();
  const overflow = [];
  const sessions = {};
  for (const [role, email, path, label] of SHOTS) {
    if (!sessions[role]) {
      const apiCtx = await browser.newContext();
      sessions[role] = await login(apiCtx.request, email);
      await apiCtx.close();
    }
    const s = sessions[role];
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await ctx.addInitScript((sess) => {
      const u = JSON.stringify(sess.user);
      localStorage.setItem('token', sess.token);
      localStorage.setItem('auth_token', sess.token);
      localStorage.setItem('user', u);
      localStorage.setItem('user_info', u);
      localStorage.setItem(`onboarding_done_${sess.user.id}`, 'true');
    }, s);
    const page = await ctx.newPage();
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    // チャットログは1クリックして会話表示まで撮る
    if (label === 'researcher-chatlogs-list') {
      await page.locator('.MuiListItemButton-root').first().click().catch(() => {});
      await page.waitForTimeout(500);
      await page.locator('.MuiListItemButton-root').nth(1).click().catch(() => {});
      await page.waitForTimeout(1000);
    }

    // 横スクロール(レイアウト溢れ)検出
    const ov = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    if (ov.scrollW > ov.clientW + 4) {
      overflow.push(`${label}: horizontal overflow ${ov.scrollW}>${ov.clientW}`);
    }
    await page.screenshot({ path: `/tmp/shot-${label}.png`, fullPage: true });
    console.log(`📸 ${label} -> /tmp/shot-${label}.png  (scrollW=${ov.scrollW} clientW=${ov.clientW})`);
    await ctx.close();
  }
  await browser.close();
  console.log('--- horizontal overflow issues ---');
  console.log(overflow.length ? overflow.join('\n') : 'none ✅');
})();
