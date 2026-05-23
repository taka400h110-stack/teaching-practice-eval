// 6ロールの「初回ログイン」(localStorageクリアな状態)の挙動を実機検証
// - ログインフォームから email/password 入力 → submit
// - 飛んだ先のURL・主要要素・コンソールエラーを記録
// - 学生はオンボーディングが出るはず、その他はダッシュボード直行のはず
const { chromium } = require('playwright');

const BASE = 'http://localhost:3000';

const ROLES = [
  { role: 'student', email: 'student@teaching-eval.jp', label: '教育実習生', expectsOnboarding: true },
  { role: 'univ_teacher', email: 'teacher@teaching-eval.jp', label: '大学の先生', expectsOnboarding: false },
  { role: 'school_mentor', email: 'mentor@teaching-eval.jp', label: '実習先の先生', expectsOnboarding: false },
  { role: 'researcher', email: 'researcher@teaching-eval.jp', label: '研究者', expectsOnboarding: false },
  { role: 'collaborator', email: 'collaborator@teaching-eval.jp', label: '研究協力者', expectsOnboarding: false },
  { role: 'board_observer', email: 'observer@teaching-eval.jp', label: '委員会', expectsOnboarding: false },
];

(async () => {
  const browser = await chromium.launch();
  console.log('\n=============================================');
  console.log('初回ログインフロー検証 (localStorage クリア状態)');
  console.log('=============================================\n');

  let totalIssues = 0;

  for (const t of ROLES) {
    const context = await browser.newContext();  // 毎回まっさら
    const page = await context.newPage();
    const issues = [];

    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') {
        const txt = m.text();
        if (txt.includes('Download the React DevTools')) return;
        if (txt.includes('favicon.ico')) return;
        issues.push(`[${m.type()}] ${txt.slice(0, 200)}`);
      }
    });
    page.on('pageerror', e => issues.push(`[pageerror] ${e.message.slice(0, 200)}`));
    page.on('response', r => {
      if (!r.url().includes('localhost:3000')) return;
      if (r.status() >= 400 && r.status() !== 304 && r.url().includes('/api/')) {
        issues.push(`[net ${r.status()}] ${r.url().replace(BASE, '')}`);
      }
    });

    try {
      // ログインページへ
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(1000);

      // メール・パスワード入力 (1番上の textbox がメール, 2番目がパスワード)
      await page.locator('input[name="email"]').fill(t.email);
      await page.locator('input[name="password"]').fill('password');
      await page.locator('button[type="submit"]').click();

      // 遷移を待つ
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const result = await page.evaluate(() => {
        return {
          url: location.pathname,
          h1: document.querySelector('h1, h2, h5')?.textContent?.trim() || '',
          bodyLen: document.body.innerText.length,
          hasOnboardingRoot: !!document.querySelector('[data-testid="onboarding-page-root"]'),
          hasDashboardRoot: !!document.querySelector('[data-testid="admin-dashboard-root"], [data-testid="teacher-dashboard-root"], [data-testid="student-dashboard-root"]'),
          pendingOnboarding: localStorage.getItem('pending_onboarding'),
          // オンボーディングが表示されているなら最初のステップの中身を取得
          stepLabel: Array.from(document.querySelectorAll('.MuiStepLabel-label.Mui-active')).map(e => e.textContent?.trim()),
          profileVisible: document.body.innerText.includes('あなたの基本情報') || document.body.innerText.includes('プロフィール設定'),
        };
      });

      console.log(`[${t.role}] ${t.label}`);
      console.log(`  到達URL: ${result.url}`);
      console.log(`  pending_onboarding: ${result.pendingOnboarding || '(未設定)'}`);
      console.log(`  オンボーディング画面: ${result.hasOnboardingRoot ? 'あり' : 'なし'}`);
      console.log(`  ダッシュボード画面: ${result.hasDashboardRoot ? 'あり' : 'なし'}`);
      if (result.hasOnboardingRoot) {
        console.log(`  アクティブステップ: ${result.stepLabel.join(', ') || '(取得不可)'}`);
        console.log(`  プロフィール入力欄表示: ${result.profileVisible ? '✅' : '⚠️ 表示されていない'}`);
      }
      console.log(`  期待: ${t.expectsOnboarding ? 'オンボーディング画面' : 'ダッシュボード'}`);
      const expectMatch = t.expectsOnboarding ? result.hasOnboardingRoot : result.hasDashboardRoot;
      console.log(`  判定: ${expectMatch ? '✅ 期待通り' : '❌ 期待と異なる'}`);
      if (issues.length > 0) {
        console.log(`  検出問題:`);
        issues.forEach(i => console.log(`     • ${i}`));
        totalIssues += issues.length;
      }
      if (!expectMatch) totalIssues++;
      console.log('');
    } catch (e) {
      console.log(`[${t.role}] 💥 例外: ${e.message}\n`);
      totalIssues++;
    }
    await context.close();
  }

  console.log('=============================================');
  console.log(`TOTAL ISSUES: ${totalIssues}`);
  console.log('=============================================');

  await browser.close();
  process.exit(totalIssues > 0 ? 1 : 0);
})();
