/**
 * 全ロール・全ページ 包括検証スクリプト（手動監査用・スタンドアロン）
 *
 * 実行: node tests/audit/full_role_page_audit.cjs
 * 前提: サービスが http://localhost:3000 で稼働、DBにデモデータ投入済み
 *
 * 各ロールでログインAPIを直接叩いてlocalStorageにセッションを確立し、
 * 許可された全ページを巡回。以下を厳密チェック:
 *  - ページ到達 (URLが /unauthorized や /login にリダイレクトされないか)
 *  - エラー画面・403表示の有無
 *  - コンソールエラー (page error / console.error)
 *  - 主要UI要素 (h1/h4/h5見出し、図表 .recharts-wrapper / canvas / table)
 *  - 空状態 (no-data) の判別
 */
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

// 各ロールのアカウント (client.ts DEMO_ACCOUNT_LIST より)
const ACCOUNTS = {
  student:        'student@teaching-eval.jp',
  univ_teacher:   'teacher@teaching-eval.jp',
  school_mentor:  'mentor@teaching-eval.jp',
  evaluator:      'evaluator@teaching-eval.jp',
  researcher:     'researcher@teaching-eval.jp',
  collaborator:   'collaborator@teaching-eval.jp',
  board_observer: 'observer@teaching-eval.jp',
  admin:          'admin@teaching-eval.jp',
};

// 各ロールが到達すべきページ (App.tsx allowedRoles より抽出)
const ROLE_PAGES = {
  student: [
    '/dashboard', '/journal-workflow', '/ocr', '/journals', '/chat',
    '/self-evaluation', '/growth', '/goals', '/bfi', '/profile',
  ],
  univ_teacher: [
    '/teacher-dashboard', '/journals', '/evaluations', '/statistics',
    '/teacher-statistics', '/cohorts', '/student-chat-logs', '/profile',
  ],
  school_mentor: [
    '/teacher-dashboard', '/journals', '/evaluations', '/statistics',
    '/teacher-statistics', '/cohorts', '/student-chat-logs', '/profile',
  ],
  evaluator: [
    '/evaluations', '/profile',
  ],
  researcher: [
    '/admin', '/teacher-dashboard', '/journals', '/evaluations', '/statistics',
    '/teacher-statistics', '/longitudinal', '/advanced-analytics', '/platform-analytics',
    '/cohorts', '/scat', '/scat-batch', '/scat-network', '/scat-timeline',
    '/research/journal-import', '/exports', '/student-chat-logs', '/profile',
  ],
  collaborator: [
    '/journals', '/evaluations', '/statistics', '/teacher-statistics',
    '/longitudinal', '/advanced-analytics', '/cohorts', '/scat', '/scat-batch',
    '/scat-network', '/scat-timeline', '/research/journal-import', '/exports', '/student-chat-logs', '/profile',
  ],
  board_observer: [
    '/journals', '/evaluations', '/statistics', '/teacher-statistics',
    '/longitudinal', '/advanced-analytics', '/cohorts', '/scat', '/scat-batch',
    '/scat-network', '/scat-timeline', '/exports', '/student-chat-logs', '/profile',
  ],
  admin: [
    '/admin', '/teacher-dashboard', '/journals', '/evaluations', '/statistics',
    '/teacher-statistics', '/longitudinal', '/advanced-analytics', '/platform-analytics',
    '/cohorts', '/scat', '/scat-batch', '/scat-network', '/scat-timeline',
    '/research/journal-import', '/exports', '/admin/exports', '/register', '/student-chat-logs', '/profile',
  ],
};

const IGNORE_CONSOLE = [
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /\[vite\]/i,
  /Lighthouse/i,
  /preload/i,
];

function ignoreMsg(m) { return IGNORE_CONSOLE.some(r => r.test(m)); }

async function loginAndGetSession(request, email) {
  const res = await request.post(`${BASE}/api/data/auth/login`, {
    data: { email, password: 'password' },
  });
  if (!res.ok()) throw new Error(`login failed for ${email}: HTTP ${res.status()}`);
  const json = await res.json();
  return json; // { user, token }
}

(async () => {
  const browser = await chromium.launch();
  const results = [];

  for (const [role, email] of Object.entries(ACCOUNTS)) {
    const apiCtx = await browser.newContext();
    let session;
    try {
      session = await loginAndGetSession(apiCtx.request, email);
    } catch (e) {
      results.push({ role, page: '(login)', status: 'LOGIN_FAIL', detail: String(e) });
      await apiCtx.close();
      continue;
    }
    await apiCtx.close();

    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    // セッションを localStorage に注入 (client.ts のキー全て)
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
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !ignoreMsg(msg.text())) consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      if (!ignoreMsg(String(err))) consoleErrors.push('PAGEERROR: ' + String(err));
    });

    for (const path of (ROLE_PAGES[role] || [])) {
      consoleErrors.length = 0;
      let rec = { role, page: path, status: 'OK', detail: '' };
      try {
        const resp = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1200); // lazy chunk + data fetch
        const finalUrl = page.url();

        // リダイレクト判定
        if (/\/unauthorized/.test(finalUrl)) { rec.status = 'UNAUTHORIZED'; rec.detail = '403 redirect'; }
        else if (/\/login/.test(finalUrl))   { rec.status = 'LOGIN_REDIRECT'; rec.detail = 'kicked to login'; }
        else if (!finalUrl.includes(path.split('?')[0]) && path !== '/') {
          rec.detail = `redirected to ${finalUrl.replace(BASE,'')}`;
        }

        // 403/エラーテキスト
        const bodyText = await page.locator('body').innerText().catch(() => '');
        if (/アクセス権限がありません|403/.test(bodyText) && rec.status === 'OK') {
          rec.status = 'FORBIDDEN_TEXT';
        }
        // React error boundary / 真っ白
        const hasError = await page.locator('text=/Something went wrong|エラーが発生|Application error|Cannot read|undefined is not/i').count();
        if (hasError > 0) { rec.status = 'RENDER_ERROR'; }

        // 主要要素カウント
        const headings = await page.locator('h1, h4, h5, [role="heading"]').count();
        const charts = await page.locator('.recharts-wrapper, canvas, svg.recharts-surface').count();
        const tables = await page.locator('table, .MuiDataGrid-root').count();
        const cards  = await page.locator('.MuiCard-root, .MuiPaper-root').count();
        rec.elements = { headings, charts, tables, cards };

        if (rec.status === 'OK' && headings === 0 && cards === 0) {
          rec.status = 'EMPTY_RENDER';
          rec.detail = 'no headings/cards rendered';
        }

        if (consoleErrors.length) {
          rec.consoleErrors = consoleErrors.slice(0, 3);
          if (rec.status === 'OK') rec.status = 'CONSOLE_ERR';
        }
      } catch (e) {
        rec.status = 'EXCEPTION';
        rec.detail = String(e).split('\n')[0];
      }
      results.push(rec);
      const flag = rec.status === 'OK' ? '✅' : (rec.status === 'EMPTY_RENDER' ? '⚠️' : '❌');
      const el = rec.elements ? `h:${rec.elements.headings} chart:${rec.elements.charts} tbl:${rec.elements.tables} card:${rec.elements.cards}` : '';
      console.log(`${flag} [${role}] ${path} -> ${rec.status} ${rec.detail} {${el}}`);
      if (rec.consoleErrors) rec.consoleErrors.forEach(e => console.log(`      ⤷ ${e.slice(0,160)}`));
    }

    await ctx.close();
  }

  // サマリ
  console.log('\n========== SUMMARY ==========');
  const byStatus = {};
  results.forEach(r => { byStatus[r.status] = (byStatus[r.status]||0)+1; });
  Object.entries(byStatus).forEach(([s,n]) => console.log(`${s}: ${n}`));
  const problems = results.filter(r => !['OK'].includes(r.status));
  console.log(`\nTOTAL pages checked: ${results.length}, problems: ${problems.length}`);

  require('fs').writeFileSync('/tmp/audit_results.json', JSON.stringify(results, null, 2));
  console.log('Full results -> /tmp/audit_results.json');
  await browser.close();
})();
