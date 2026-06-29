// Console & network error audit across roles and key pages.
// Run from /home/user/webapp:  node tests/audit/console_error_audit.cjs
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';

const ROLES = {
  student:   { email: 'student@teaching-eval.jp',   pages: ['/dashboard','/journal-workflow','/ocr','/journals','/self-assessment','/growth','/goals','/bfi'] },
  univ_teacher: { email: 'teacher@teaching-eval.jp', pages: ['/teacher-dashboard','/teacher/journals','/student-chat-logs','/cohorts','/statistics'] },
  researcher: { email: 'researcher@teaching-eval.jp', pages: ['/researcher-dashboard','/evaluations','/cohorts','/longitudinal','/scat','/statistics','/student-chat-logs','/data-export'] },
  admin:     { email: 'admin@teaching-eval.jp',      pages: ['/admin-dashboard','/admin/users','/admin/approvals','/student-chat-logs'] },
};

// Benign console noise we ignore (dev/CDN/React devtools, etc.)
const IGNORE = [
  /Download the React DevTools/i,
  /Lit is in dev mode/i,
  /\[vite\]/i,
  /favicon\.ico/i,
  /ResizeObserver loop/i,
];

function ignored(text){ return IGNORE.some(r => r.test(text)); }

(async () => {
  const browser = await chromium.launch();
  const findings = [];

  for (const [role, cfg] of Object.entries(ROLES)) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();

    // login via API then set localStorage
    const resp = await page.request.post(`${BASE}/api/data/auth/login`, {
      data: { email: cfg.email, password: 'password' },
      headers: { 'Content-Type': 'application/json' },
    });
    const body = await resp.json();
    if (!body.success) { findings.push({ role, page: 'LOGIN', type: 'login-fail', text: JSON.stringify(body) }); await ctx.close(); continue; }

    await page.goto(`${BASE}/login`);
    await page.evaluate(({ user, token }) => {
      localStorage.setItem('user_info', JSON.stringify(user));
      localStorage.setItem('auth_token', token);
    }, { user: body.user, token: body.token });

    for (const path of cfg.pages) {
      const consoleErrors = [];
      const netErrors = [];
      const onConsole = (msg) => { if (msg.type() === 'error' && !ignored(msg.text())) consoleErrors.push(msg.text()); };
      const onResponse = (r) => { if (r.status() >= 400 && !ignored(r.url())) netErrors.push(`${r.status()} ${r.url()}`); };
      const onPageError = (err) => { if (!ignored(err.message)) consoleErrors.push('PAGEERROR: ' + err.message); };
      page.on('console', onConsole);
      page.on('response', onResponse);
      page.on('pageerror', onPageError);
      try {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 20000 });
        await page.waitForTimeout(1200);
      } catch (e) {
        findings.push({ role, page: path, type: 'nav-error', text: e.message.slice(0,120) });
      }
      page.off('console', onConsole);
      page.off('response', onResponse);
      page.off('pageerror', onPageError);
      if (consoleErrors.length) findings.push({ role, page: path, type: 'console', text: consoleErrors.slice(0,5).join(' | ') });
      if (netErrors.length)     findings.push({ role, page: path, type: 'network', text: netErrors.slice(0,5).join(' | ') });
    }
    await ctx.close();
  }

  await browser.close();

  console.log('=== CONSOLE/NETWORK ERROR AUDIT ===');
  if (!findings.length) {
    console.log('CLEAN: no console errors, no >=400 network responses, no nav errors.');
  } else {
    for (const f of findings) console.log(`[${f.type}] ${f.role} ${f.page}: ${f.text}`);
    console.log(`\nTOTAL FINDINGS: ${findings.length}`);
  }
})();
