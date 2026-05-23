// 学生のオンボーディング全ステップを通しで検証
// Step0 プロフィール → Step1 実習情報 → Step2 BigFive → Step3 SMART → Step4 完了 → /dashboard
// 備考: 研究倫理同意はシステム外で別途取得するため、オンボーディングからは除外されている。
const { chromium } = require('playwright');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const issues = [];

  page.on('console', m => {
    if ((m.type() === 'error' || m.type() === 'warning') && !m.text().includes('DevTools')) {
      issues.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
    }
  });
  page.on('pageerror', e => issues.push(`[pageerror] ${e.message.slice(0, 200)}`));

  console.log('\n=== 学生オンボーディング全ステップ通しテスト ===\n');

  // ログイン
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[name="email"]').fill('student@teaching-eval.jp');
  await page.locator('input[name="password"]').fill('password');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/onboarding/, { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Step0: プロフィール設定
  const step0 = await page.evaluate(() => ({
    url: location.pathname,
    activeStep: Array.from(document.querySelectorAll('.MuiStepLabel-label.Mui-active')).map(e => e.textContent?.trim()).join(','),
    hasStudentId: !!Array.from(document.querySelectorAll('label')).find(l => l.textContent?.includes('学籍番号')),
  }));
  console.log(`Step0: アクティブ=${step0.activeStep} | 学籍番号フィールド=${step0.hasStudentId ? '✅' : '❌'}`);

  // 学籍番号と氏名を入力
  await page.locator('input[placeholder*="2024A001"]').fill('2024TEST001');
  const nameField = page.locator('input[required]').nth(1);
  await nameField.fill('テスト 太郎');
  await page.waitForTimeout(500);

  await page.locator('button', { hasText: '次へ' }).click();
  await page.waitForTimeout(1500);

  // Step1: 実習情報
  const step1 = await page.evaluate(() => ({
    activeStep: Array.from(document.querySelectorAll('.MuiStepLabel-label.Mui-active')).map(e => e.textContent?.trim()).join(','),
    hasSchoolType: !!Array.from(document.querySelectorAll('label')).find(l => l.textContent?.includes('実習校種別')),
  }));
  console.log(`Step1: アクティブ=${step1.activeStep} | 実習校種別=${step1.hasSchoolType ? '✅' : '❌'}`);

  await page.locator('button', { hasText: '次へ' }).click();
  await page.waitForTimeout(1500);

  // Step2: BigFive
  const step2 = await page.evaluate(() => ({
    activeStep: Array.from(document.querySelectorAll('.MuiStepLabel-label.Mui-active')).map(e => e.textContent?.trim()).join(','),
    hasBigFive: document.body.innerText.includes('BigFive') || document.body.innerText.includes('並川'),
    sliderCount: document.querySelectorAll('[role="slider"]').length,
  }));
  console.log(`Step2: アクティブ=${step2.activeStep} | BigFive=${step2.hasBigFive ? '✅' : '❌'} | スライダー数=${step2.sliderCount}`);

  await page.locator('button', { hasText: '次へ' }).click();
  await page.waitForTimeout(1500);

  // Step3: SMART
  const step3 = await page.evaluate(() => ({
    activeStep: Array.from(document.querySelectorAll('.MuiStepLabel-label.Mui-active')).map(e => e.textContent?.trim()).join(','),
    hasSmart: document.body.innerText.includes('SMART'),
  }));
  console.log(`Step3: アクティブ=${step3.activeStep} | SMART目標=${step3.hasSmart ? '✅' : '❌'}`);

  await page.locator('button', { hasText: '次へ' }).click();
  await page.waitForTimeout(1500);

  // Step4: 完了
  const step4 = await page.evaluate(() => ({
    activeStep: Array.from(document.querySelectorAll('.MuiStepLabel-label.Mui-active')).map(e => e.textContent?.trim()).join(','),
    completeVisible: document.body.innerText.includes('設定完了'),
  }));
  console.log(`Step4: アクティブ=${step4.activeStep} | 完了画面=${step4.completeVisible ? '✅' : '❌'}`);

  // 「ダッシュボードへ」をクリック
  await page.locator('button', { hasText: 'ダッシュボードへ' }).click();
  await page.waitForTimeout(3000);

  const final = await page.evaluate(() => ({
    url: location.pathname,
    hasDashboard: !!document.querySelector('[data-testid*="dashboard"]') || document.body.innerText.includes('ダッシュボード'),
    pendingOnboarding: localStorage.getItem('pending_onboarding'),
    onboardingDoneKey: Object.keys(localStorage).filter(k => k.startsWith('onboarding_done_')),
  }));
  console.log(`\n最終: URL=${final.url} | ダッシュボード=${final.hasDashboard ? '✅' : '❌'}`);
  console.log(`pending_onboarding 後始末: ${final.pendingOnboarding || '(クリア済 ✅)'}`);
  console.log(`onboarding_done キー: ${final.onboardingDoneKey.join(', ') || '(なし)'}`);

  console.log('\n--- 検出された問題 ---');
  if (issues.length === 0) console.log('(なし ✅)');
  else issues.forEach(i => console.log(`  • ${i}`));

  await context.close();
  await browser.close();
  process.exit(issues.length > 0 ? 1 : 0);
})();
