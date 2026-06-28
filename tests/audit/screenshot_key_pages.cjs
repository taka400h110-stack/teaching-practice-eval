/**
 * 主要ページのスクリーンショット撮影（視覚検証用）
 * 6因子表示・データ連動・図表レイアウトを目視確認するため
 */
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = '/tmp/shots';
require('fs').mkdirSync(OUT, { recursive: true });

const ACCOUNTS = {
  student: 'student@teaching-eval.jp',
  univ_teacher: 'teacher@teaching-eval.jp',
  evaluator: 'evaluator@teaching-eval.jp',
  researcher: 'researcher@teaching-eval.jp',
  admin: 'admin@teaching-eval.jp',
};

// (role, path, filename) — 6因子・データ連動・図表が重要なページ
const SHOTS = [
  ['student', '/dashboard', 'student-dashboard'],
  ['student', '/growth', 'student-growth'],          // 6因子成長グラフ
  ['student', '/self-evaluation', 'student-self-eval'], // 6因子自己評価
  ['student', '/journals', 'student-journals'],       // 日誌一覧(連動元)
  ['student', '/journal-workflow', 'student-workflow'],
  ['student', '/bfi', 'student-bfi'],                 // BFI個別フィードバック
  ['univ_teacher', '/statistics', 'teacher-statistics'], // 6因子統計図表
  ['univ_teacher', '/evaluations', 'teacher-evaluations'],
  ['evaluator', '/evaluations', 'evaluator-evaluations'], // 図表8個
  ['researcher', '/longitudinal', 'researcher-longitudinal'], // 6因子縦断
  ['researcher', '/statistics', 'researcher-statistics'],
  ['admin', '/admin', 'admin-dashboard'],             // 図表20個
];

async function login(request, email) {
  const res = await request.post(`${BASE}/api/data/auth/login`, { data: { email, password: 'password' } });
  return await res.json();
}

(async () => {
  const browser = await chromium.launch();
  // group by role to reuse session
  const byRole = {};
  for (const s of SHOTS) { (byRole[s[0]] ||= []).push(s); }

  for (const [role, shots] of Object.entries(byRole)) {
    const apiCtx = await browser.newContext();
    const session = await login(apiCtx.request, ACCOUNTS[role]);
    await apiCtx.close();

    const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
    await ctx.addInitScript((s) => {
      const u = JSON.stringify(s.user);
      localStorage.setItem('token', s.token);
      localStorage.setItem('auth_token', s.token);
      localStorage.setItem('user', u);
      localStorage.setItem('user_info', u);
      localStorage.setItem(`onboarding_done_${s.user.id}`, 'true');
      localStorage.removeItem('pending_onboarding');
    }, session);
    const page = await ctx.newPage();

    for (const [, path, name] of shots) {
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2500); // charts render
        await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
        console.log(`📸 ${name}.png`);
      } catch (e) {
        console.log(`❌ ${name}: ${String(e).split('\n')[0]}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log('Done -> ' + OUT);
})();
