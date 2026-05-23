// 各ロールでログイン → 主要画面を巡回してコンソールエラーを収集
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';

// ロール × 巡回する画面パス
const ROLE_PATHS = {
  student: {
    label: '教育実習生',
    email: 'student@teaching-eval.jp',
    paths: ['/dashboard', '/journals', '/self-evaluation', '/goals', '/growth', '/chat']
  },
  univ_teacher: {
    label: '大学の先生',
    email: 'teacher@teaching-eval.jp',
    paths: ['/teacher-dashboard', '/journals', '/evaluations', '/statistics', '/cohorts']
  },
  school_mentor: {
    label: '実習先の先生',
    email: 'mentor@teaching-eval.jp',
    paths: ['/teacher-dashboard', '/journals', '/evaluations']
  },
  researcher: {
    label: '研究者',
    email: 'researcher@teaching-eval.jp',
    paths: ['/admin', '/statistics', '/advanced-analytics', '/scat', '/scat-network', '/scat-timeline', '/research/journal-import', '/exports', '/reliability', '/longitudinal']
  },
  collaborator: {
    label: '研究協力者',
    email: 'collaborator@teaching-eval.jp',
    paths: ['/admin', '/statistics', '/journals', '/scat', '/exports']
  },
  board_observer: {
    label: '委員会',
    email: 'observer@teaching-eval.jp',
    paths: ['/admin', '/statistics', '/journals', '/exports']
  },
};

(async () => {
  const browser = await chromium.launch();
  const allReports = [];
  let totalErrors = 0;
  let totalPaths = 0;

  for (const [role, def] of Object.entries(ROLE_PATHS)) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    // セッション一括注入
    const res = await page.request.post(`${BASE}/api/data/auth/login`, {
      data: { email: def.email, password: 'password' }
    });
    const json = await res.json();
    const token = json.token;
    const user = json.user;

    await page.goto(`${BASE}/login`);
    await page.evaluate(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user_info', JSON.stringify(user));
      if (user?.id) localStorage.setItem(`onboarding_done_${user.id}`, 'true');
    }, { token, user });

    const roleReport = { role, label: def.label, paths: [] };
    for (const path of def.paths) {
      totalPaths++;
      const errors = [];
      const pageErrors = [];

      const onConsole = msg => {
        const text = msg.text();
        if (text.includes('Download the React DevTools')) return;
        if (text.includes('source-map')) return;
        if (msg.type() === 'error') errors.push(text.slice(0, 250));
      };
      const onPageError = e => pageErrors.push(String(e).slice(0, 300));

      page.on('console', onConsole);
      page.on('pageerror', onPageError);

      let finalUrl = '';
      try {
        await page.goto(`${BASE}${path}`);
        await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
        await page.waitForTimeout(1500);
        finalUrl = page.url().replace(BASE, '');
      } catch (e) {
        pageErrors.push(`NAVIGATION_ERROR: ${e.message}`);
      }

      page.off('console', onConsole);
      page.off('pageerror', onPageError);

      const errCount = errors.length + pageErrors.length;
      totalErrors += errCount;
      roleReport.paths.push({ path, finalUrl, errors, pageErrors, errCount });
    }
    allReports.push(roleReport);
    await ctx.close();
  }

  await browser.close();

  // レポート
  console.log('\n=============================================');
  console.log('ROLE × PAGE UI SMOKE REPORT');
  console.log('=============================================');
  for (const r of allReports) {
    console.log(`\n### [${r.role}] ${r.label}`);
    for (const p of r.paths) {
      const redirected = p.finalUrl && p.finalUrl !== p.path;
      const redirNote = redirected ? `  →redirected→ ${p.finalUrl}` : '';
      if (p.errCount === 0) {
        console.log(`  ✅ ${p.path}${redirNote}`);
      } else {
        console.log(`  ❌ ${p.path}${redirNote} — ${p.errCount} error(s):`);
        [...p.pageErrors, ...p.errors].forEach(e => console.log(`     • ${e}`));
      }
    }
  }
  console.log('\n=============================================');
  console.log(`TOTAL: ${totalPaths} pages | ERRORS: ${totalErrors}`);
  console.log('=============================================');
  process.exit(totalErrors > 0 ? 1 : 0);
})();
