// 各ロール代表画面のレンダリング深度チェック
// - 本文文字数
// - h1/h2/h3 タイトル取得
// - エラーバナーらしき要素の検出
const { chromium } = require('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

const TARGETS = [
  { role: 'student', email: 'student@teaching-eval.jp', label: '教育実習生', path: '/dashboard' },
  { role: 'student', email: 'student@teaching-eval.jp', label: '教育実習生', path: '/self-evaluation' },
  { role: 'univ_teacher', email: 'teacher@teaching-eval.jp', label: '大学の先生', path: '/teacher-dashboard' },
  { role: 'univ_teacher', email: 'teacher@teaching-eval.jp', label: '大学の先生', path: '/statistics' },
  { role: 'school_mentor', email: 'mentor@teaching-eval.jp', label: '実習先の先生', path: '/teacher-dashboard' },
  { role: 'school_mentor', email: 'mentor@teaching-eval.jp', label: '実習先の先生', path: '/evaluations' },
  { role: 'researcher', email: 'researcher@teaching-eval.jp', label: '研究者', path: '/admin' },
  { role: 'researcher', email: 'researcher@teaching-eval.jp', label: '研究者', path: '/advanced-analytics' },
  { role: 'researcher', email: 'researcher@teaching-eval.jp', label: '研究者', path: '/scat' },
  { role: 'collaborator', email: 'collaborator@teaching-eval.jp', label: '研究協力者', path: '/scat' },
  { role: 'board_observer', email: 'observer@teaching-eval.jp', label: '委員会', path: '/statistics' },
  { role: 'board_observer', email: 'observer@teaching-eval.jp', label: '委員会', path: '/exports' },
];

(async () => {
  const browser = await chromium.launch();
  console.log('\n=============================================');
  console.log('RENDER DEPTH CHECK');
  console.log('=============================================\n');

  for (const t of TARGETS) {
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

    try {
      await page.goto(`${BASE}${t.path}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      const data = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
          .map(h => h.textContent?.trim())
          .filter(Boolean)
          .slice(0, 5);
        const bodyLen = document.body.innerText.length;
        // MUI Alert error severity 検出
        const errorAlerts = Array.from(document.querySelectorAll('[role="alert"], .MuiAlert-standardError, .MuiAlert-filledError'))
          .map(e => e.textContent?.trim())
          .filter(Boolean);
        return { headings, bodyLen, errorAlerts, url: location.pathname };
      });

      console.log(`[${t.role}] ${t.label} → ${t.path}`);
      console.log(`  URL確定: ${data.url}`);
      console.log(`  本文: ${data.bodyLen} chars`);
      console.log(`  見出し: ${data.headings.join(' / ') || '(なし)'}`);
      if (data.errorAlerts.length > 0) {
        console.log(`  ⚠️ エラーバナー: ${data.errorAlerts.join(' | ')}`);
      }
      console.log('');
    } catch (e) {
      console.log(`[${t.role}] ${t.path} → 💥 ${e.message}\n`);
    }
    await context.close();
  }

  await browser.close();
})();
