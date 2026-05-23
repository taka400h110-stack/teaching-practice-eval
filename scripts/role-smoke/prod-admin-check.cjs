// 本番(Cloudflare Pages)で 6 ロール × /admin を検証
const { chromium } = require('playwright');

const BASE = 'https://teaching-practice-eval.pages.dev';

const ROLES = [
  { role: 'researcher', email: 'researcher@teaching-eval.jp', label: '研究者' },
  { role: 'collaborator', email: 'collaborator@teaching-eval.jp', label: '研究協力者' },
  { role: 'board_observer', email: 'observer@teaching-eval.jp', label: '委員会' },
  { role: 'admin', email: 'admin@teaching-eval.jp', label: '管理者 (比較用)' },
];

(async () => {
  const browser = await chromium.launch();
  console.log('\n=== 本番 /admin ロール別 表示確認 ===\n');

  for (const t of ROLES) {
    const context = await browser.newContext();
    const page = await context.newPage();

    const r = await page.request.post(`${BASE}/api/data/auth/login`, {
      data: { email: t.email, password: 'password' }
    });
    const { user, token } = await r.json();

    await page.addInitScript(({ user, token }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user_info', JSON.stringify(user));
      localStorage.setItem(`onboarding_done_${user.id}`, 'true');
    }, { user, token });

    await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    const data = await page.evaluate(() => {
      const errorAlerts = Array.from(document.querySelectorAll('.MuiAlert-standardError, .MuiAlert-filledError'))
        .map(e => e.textContent?.trim())
        .filter(Boolean);
      const warningAlerts = Array.from(document.querySelectorAll('.MuiAlert-standardWarning, .MuiAlert-filledWarning'))
        .map(e => e.textContent?.trim())
        .filter(Boolean);
      const hasProviderPanel = !!document.body.innerText.match(/Operational Readiness|Provider Health|Blocking Issues/);
      return { errorAlerts, warningAlerts, hasProviderPanel, url: location.pathname };
    });

    console.log(`[${t.role}] ${t.label}`);
    console.log(`  URL: ${data.url}`);
    console.log(`  SRE Panel表示: ${data.hasProviderPanel ? '✅ あり (admin期待)' : '⛔ なし'}`);
    console.log(`  error バナー: ${data.errorAlerts.length > 0 ? data.errorAlerts.map(s => s.slice(0,80)).join(' | ') : '(なし)'}`);
    console.log(`  warning バナー: ${data.warningAlerts.length > 0 ? data.warningAlerts.map(s => s.slice(0,80)).join(' | ') : '(なし)'}`);
    console.log('');

    await context.close();
  }
  await browser.close();
})();
