import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

// Use mobile viewport for this suite
test.use({ viewport: { width: 375, height: 667 } });

test.describe('Mobile Interaction Audit', () => {

  test('Student Dashboard - Mobile View', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/dashboard');
    
    // Check if hamburger menu or mobile-friendly root is visible
    const root = page.getByTestId('student-dashboard-root');
    await expect(root).toBeVisible({ timeout: 15000 });
    
    // Verify that some key elements don't overflow (basic check)
    // Soft width check or just visibility
    expect(await root.isVisible()).toBeTruthy();
  });

  test('Teacher Dashboard - Mobile View', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await page.goto('/teacher-dashboard');
    
    const root = page.getByTestId('teacher-dashboard-root');
    await expect(root).toBeVisible({ timeout: 15000 });
    
    // Soft width check or just visibility
    expect(await root.isVisible()).toBeTruthy();
  });

  test('Admin Dashboard - Mobile View', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await page.goto('/admin');
    
    const root = page.getByTestId('admin-dashboard-root');
    await expect(root).toBeVisible({ timeout: 15000 });
    
    // Soft width check or just visibility
    expect(await root.isVisible()).toBeTruthy();
  });

  // 横スクロール（オーバーフロー）検知: モバイル幅で document が viewport を超えていないか
  // 実機での「右にはみ出して横スクロールが出る」典型的なレイアウト崩れを自動検知する
  const studentPages: { name: string; path: string }[] = [
    { name: 'ダッシュボード', path: '/dashboard' },
    { name: '日誌ワークフロー', path: '/journal-workflow' },
    { name: '過去の日誌一覧', path: '/journals' },
    { name: '成長グラフ', path: '/growth' },
    { name: '目標履歴', path: '/goals' },
    { name: 'チャット履歴', path: '/chat' },
  ];

  for (const p of studentPages) {
    test(`No horizontal overflow (mobile 375px): ${p.name}`, async ({ page }) => {
      await loginAs(page, { role: 'student', state: 'ready' });
      await page.goto(p.path);
      await page.waitForLoadState('networkidle');

      // レイアウトが落ち着くのを少し待つ
      await page.waitForTimeout(500);

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      // 数pxの誤差は許容（スクロールバー等）。明確なはみ出し(>2px)のみ失敗とする
      const overflow = scrollWidth - clientWidth;
      expect(
        overflow,
        `${p.name} (${p.path}) が横方向に ${overflow}px はみ出しています (scrollWidth=${scrollWidth}, clientWidth=${clientWidth})`
      ).toBeLessThanOrEqual(2);
    });
  }
});
