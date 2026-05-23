// 各ロールでログイン → 主要画面を巡回
// 検出対象: console.error / console.warn / pageerror / API 4xx・5xx / 画面の空レンダ
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

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
  }
};

// 既知の無視リスト(本質的ではないノイズ)
const IGNORE_PATTERNS = [
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /\/api\/data\/auth\/me.*401/i,  // 別タブのトークン期限切れチェックなど(本筋ではない)
];

function shouldIgnore(msg) {
  return IGNORE_PATTERNS.some(p => p.test(msg));
}

async function loginAndGetAuth(page, email) {
  const resp = await page.request.post(`${BASE}/api/data/auth/login`, {
    data: { email, password: 'password' }
  });
  if (!resp.ok()) {
    throw new Error(`Login failed for ${email}: HTTP ${resp.status()}`);
  }
  const json = await resp.json();
  if (!json.success || !json.user || !json.token) {
    throw new Error(`Login response invalid for ${email}: ${JSON.stringify(json)}`);
  }
  return { user: json.user, token: json.token };
}

async function visitPath(context, role, label, path, auth) {
  const page = await context.newPage();
  const issues = [];

  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      const text = msg.text();
      if (shouldIgnore(text)) return;
      issues.push(`[console.${type}] ${text.slice(0, 250)}`);
    }
  });
  page.on('pageerror', (err) => {
    issues.push(`[pageerror] ${(err.message || String(err)).slice(0, 250)}`);
  });
  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    // localhost のAPIで4xx/5xxのみ拾う(外部CDN等は無視)
    if (!url.includes('localhost:3000')) return;
    if (status >= 400 && status !== 304) {
      if (shouldIgnore(`${url} ${status}`)) return;
      // /api/* に絞る(静的アセットの一時404は無視)
      if (url.includes('/api/')) {
        issues.push(`[net ${status}] ${url.replace(BASE, '')}`);
      }
    }
  });

  // localStorage にトークンとユーザー情報を注入
  await page.addInitScript(({ user, token }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('user_info', JSON.stringify(user));
    localStorage.setItem(`onboarding_done_${user.id}`, 'true');
  }, auth);

  try {
    const resp = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    if (!resp) {
      issues.push(`[goto] no response`);
    } else if (resp.status() >= 400) {
      issues.push(`[goto ${resp.status()}] ${path}`);
    }
    // SPAなので少し待ってAPIコール完了させる
    await page.waitForTimeout(2500);

    // ハードクラッシュ検出: ルート内容が空 or "Unauthorized"
    const finalUrl = page.url();
    if (finalUrl.includes('/unauthorized')) {
      issues.push(`[redirect] /unauthorized へリダイレクトされた`);
    } else if (finalUrl.includes('/login')) {
      issues.push(`[redirect] /login へリダイレクトされた`);
    }

    // 画面に何か表示されているか
    const bodyText = await page.evaluate(() => document.body.innerText.trim().length);
    if (bodyText < 5) {
      issues.push(`[empty] 本文がほぼ空 (${bodyText} chars)`);
    }
  } catch (e) {
    issues.push(`[exception] ${e.message.slice(0, 250)}`);
  } finally {
    await page.close();
  }

  return issues;
}

(async () => {
  const browser = await chromium.launch();
  const results = {};
  let totalPaths = 0;
  let totalIssues = 0;

  for (const [role, info] of Object.entries(ROLE_PATHS)) {
    const context = await browser.newContext();
    const tmpPage = await context.newPage();
    let auth;
    try {
      auth = await loginAndGetAuth(tmpPage, info.email);
    } catch (e) {
      results[role] = { label: info.label, fatal: e.message, paths: {} };
      await tmpPage.close();
      await context.close();
      continue;
    }
    await tmpPage.close();

    results[role] = { label: info.label, paths: {} };
    for (const path of info.paths) {
      const issues = await visitPath(context, role, info.label, path, auth);
      results[role].paths[path] = issues;
      totalPaths++;
      totalIssues += issues.length;
    }
    await context.close();
  }

  await browser.close();

  console.log('\n=============================================');
  console.log('ROLE × PAGE UI SMOKE REPORT (STRICT)');
  console.log('=============================================\n');

  for (const [role, info] of Object.entries(results)) {
    console.log(`### [${role}] ${info.label}`);
    if (info.fatal) {
      console.log(`  💥 LOGIN FAILED: ${info.fatal}\n`);
      continue;
    }
    for (const [path, issues] of Object.entries(info.paths)) {
      if (issues.length === 0) {
        console.log(`  ✅ ${path}`);
      } else {
        console.log(`  ❌ ${path} — ${issues.length} issue(s):`);
        issues.forEach(i => console.log(`     • ${i}`));
      }
    }
    console.log('');
  }

  console.log('=============================================');
  console.log(`TOTAL: ${totalPaths} pages | ISSUES: ${totalIssues}`);
  console.log('=============================================');

  process.exit(totalIssues > 0 ? 1 : 0);
})();
