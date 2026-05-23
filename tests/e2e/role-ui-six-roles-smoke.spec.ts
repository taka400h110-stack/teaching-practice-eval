/**
 * role-ui-six-roles-smoke.spec.ts
 *
 * 教育実習評価システムの 6 つの主要ロールが、ログイン後に各自の主要画面を
 * 巡回して以下のエラーを一切起こさないことを保証するスモークテスト。
 *
 *   - console.error / console.warn (一部既知ノイズは除外)
 *   - pageerror (JS 実行時クラッシュ)
 *   - /api/* の 4xx/5xx レスポンス
 *   - /unauthorized / /login への意図しないリダイレクト
 *   - レンダリング結果が空 (本文 5 文字未満)
 *
 * 対象ロール:
 *   - student         : 教育実習生 (山田 太郎)
 *   - univ_teacher    : 大学の先生 (佐藤 花子)
 *   - school_mentor   : 実習先の先生 (鈴木 一郎)
 *   - researcher      : 研究者 (伊藤 研究者)
 *   - collaborator    : 研究協力者 (渡辺 協力者)
 *   - board_observer  : 委員会 (中村 委員)
 */
import { test, expect, Page, BrowserContext } from '@playwright/test';

interface RoleSpec {
  role: string;
  label: string;
  email: string;
  paths: string[];
}

const ROLE_SPECS: RoleSpec[] = [
  {
    role: 'student',
    label: '教育実習生',
    email: 'student@teaching-eval.jp',
    paths: ['/dashboard', '/journals', '/self-evaluation', '/goals', '/growth', '/chat'],
  },
  {
    role: 'univ_teacher',
    label: '大学の先生',
    email: 'teacher@teaching-eval.jp',
    paths: ['/teacher-dashboard', '/journals', '/evaluations', '/statistics', '/cohorts'],
  },
  {
    role: 'school_mentor',
    label: '実習先の先生',
    email: 'mentor@teaching-eval.jp',
    paths: ['/teacher-dashboard', '/journals', '/evaluations'],
  },
  {
    role: 'researcher',
    label: '研究者',
    email: 'researcher@teaching-eval.jp',
    paths: [
      '/admin',
      '/statistics',
      '/advanced-analytics',
      '/scat',
      '/scat-network',
      '/scat-timeline',
      '/research/journal-import',
      '/exports',
      '/reliability',
      '/longitudinal',
    ],
  },
  {
    role: 'collaborator',
    label: '研究協力者',
    email: 'collaborator@teaching-eval.jp',
    paths: ['/admin', '/statistics', '/journals', '/scat', '/exports'],
  },
  {
    role: 'board_observer',
    label: '委員会',
    email: 'observer@teaching-eval.jp',
    paths: ['/admin', '/statistics', '/journals', '/exports'],
  },
];

// 検出基準から除外する既知ノイズ (Devtools 警告、favicon 404 等)
const IGNORE_PATTERNS: RegExp[] = [
  /Download the React DevTools/i,
  /favicon\.ico/i,
];

function shouldIgnore(msg: string): boolean {
  return IGNORE_PATTERNS.some((p) => p.test(msg));
}

async function loginViaApi(
  page: Page,
  email: string,
): Promise<{ user: any; token: string }> {
  const resp = await page.request.post('/api/data/auth/login', {
    data: { email, password: 'password' },
  });
  expect(resp.ok(), `login should succeed for ${email}`).toBe(true);
  const json = (await resp.json()) as { success: boolean; user: any; token: string };
  expect(json.success, `login response.success should be true for ${email}`).toBe(true);
  expect(json.token, `login should return token for ${email}`).toBeTruthy();
  return { user: json.user, token: json.token };
}

async function seedAuthIntoLocalStorage(
  context: BrowserContext,
  auth: { user: any; token: string },
): Promise<void> {
  await context.addInitScript((authData) => {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('auth_token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData.user));
    localStorage.setItem('user_info', JSON.stringify(authData.user));
    // student 以外は onboarding 不要だが念のため全部マークしておく
    localStorage.setItem(`onboarding_done_${authData.user.id}`, 'true');
    localStorage.removeItem('pending_onboarding');
  }, auth);
}

async function visitAndCollectIssues(
  page: Page,
  path: string,
): Promise<string[]> {
  const issues: string[] = [];

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
    if (!url.includes('/api/')) return;
    if (status >= 400 && status !== 304) {
      if (shouldIgnore(`${url} ${status}`)) return;
      issues.push(`[net ${status}] ${url.replace(/^https?:\/\/[^/]+/, '')}`);
    }
  });

  const resp = await page.goto(path, {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });
  if (!resp) {
    issues.push('[goto] no response');
  } else if (resp.status() >= 400) {
    issues.push(`[goto ${resp.status()}] ${path}`);
  }

  // SPA: 主要 API コール完了を少し待つ
  await page.waitForTimeout(2500);

  const finalUrl = new URL(page.url()).pathname;
  if (finalUrl.includes('/unauthorized')) {
    issues.push('[redirect] /unauthorized へリダイレクトされた');
  } else if (finalUrl === '/login') {
    issues.push('[redirect] /login へリダイレクトされた');
  }

  const bodyLen = await page.evaluate(
    () => document.body.innerText.trim().length,
  );
  if (bodyLen < 5) {
    issues.push(`[empty] 本文がほぼ空 (${bodyLen} chars)`);
  }

  return issues;
}

test.describe('Six-role UI smoke - 主要 6 ロール × 主要画面巡回', () => {
  for (const spec of ROLE_SPECS) {
    test(`[${spec.role}] ${spec.label} は ${spec.paths.length} 画面をエラーなく巡回できる`, async ({
      browser,
    }) => {
      const tmpContext = await browser.newContext();
      const tmpPage = await tmpContext.newPage();
      const auth = await loginViaApi(tmpPage, spec.email);
      await tmpPage.close();
      await tmpContext.close();

      const context = await browser.newContext();
      await seedAuthIntoLocalStorage(context, auth);

      const allIssues: Record<string, string[]> = {};
      for (const path of spec.paths) {
        const page = await context.newPage();
        const issues = await visitAndCollectIssues(page, path);
        allIssues[path] = issues;
        await page.close();
      }
      await context.close();

      const summary = Object.entries(allIssues)
        .map(([p, issues]) =>
          issues.length === 0
            ? `  ✅ ${p}`
            : `  ❌ ${p}\n${issues.map((i) => `     • ${i}`).join('\n')}`,
        )
        .join('\n');
      const totalIssues = Object.values(allIssues).reduce(
        (s, arr) => s + arr.length,
        0,
      );

      // テスト結果に含める形でログを残す
      // (CI のテスト出力で確認できる)
      // eslint-disable-next-line no-console
      console.log(
        `\n[${spec.role}] ${spec.label} (${spec.paths.length} pages):\n${summary}\nTOTAL ISSUES: ${totalIssues}\n`,
      );

      expect(
        totalIssues,
        `${spec.label} で ${totalIssues} 件の問題が検出されました\n${summary}`,
      ).toBe(0);
    });
  }
});

test.describe('Six-role initial login flow - 初回ログイン挙動', () => {
  // localStorage が空の状態で /login から実際にログインし、
  // - 学生は /onboarding (Step0 = 研究倫理同意) に遷移
  // - その他は各自のダッシュボードに直行
  // することを検証

  const FLOW_CASES = [
    {
      role: 'student',
      label: '教育実習生',
      email: 'student@teaching-eval.jp',
      expectUrl: /\/onboarding/,
      expectText: '研究参加同意書',
    },
    {
      role: 'univ_teacher',
      label: '大学の先生',
      email: 'teacher@teaching-eval.jp',
      expectUrl: /\/teacher-dashboard/,
      expectText: null,
    },
    {
      role: 'school_mentor',
      label: '実習先の先生',
      email: 'mentor@teaching-eval.jp',
      expectUrl: /\/teacher-dashboard/,
      expectText: null,
    },
    {
      role: 'researcher',
      label: '研究者',
      email: 'researcher@teaching-eval.jp',
      expectUrl: /\/admin/,
      expectText: null,
    },
    {
      role: 'collaborator',
      label: '研究協力者',
      email: 'collaborator@teaching-eval.jp',
      expectUrl: /\/admin/,
      expectText: null,
    },
    {
      role: 'board_observer',
      label: '委員会',
      email: 'observer@teaching-eval.jp',
      expectUrl: /\/admin/,
      expectText: null,
    },
  ];

  for (const c of FLOW_CASES) {
    test(`[${c.role}] ${c.label} の初回ログインは ${c.expectUrl} に到達する`, async ({
      page,
    }) => {
      await page.goto('/login');
      await page.locator('input[name="email"]').fill(c.email);
      await page.locator('input[name="password"]').fill('password');
      await page.locator('button[type="submit"]').click();

      await page.waitForURL(c.expectUrl, { timeout: 15000 });
      await page.waitForLoadState('networkidle').catch(() => {});

      if (c.expectText) {
        await expect(page.getByText(c.expectText)).toBeVisible({
          timeout: 10000,
        });
      }
    });
  }
});
