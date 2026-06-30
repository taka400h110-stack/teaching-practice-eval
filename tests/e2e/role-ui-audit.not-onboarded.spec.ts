import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

test.describe('Role-based UI audit - Not Onboarded', () => {

  test('student with pending onboarding is redirected to onboarding and cannot bypass it', async ({ page, context, request }) => {
    // デモ学生はログイン時にオンボーディングをスキップ（pending_onboarding を解除）するため、
    // 通常のログインフローでは未完了状態を再現できない。
    // ここでは「PrivateRoute のオンボーディングガード自体」が正しく機能することを
    // 検証するため、ログインフローを経由せず、認証状態と pending_onboarding="true" を
    // addInitScript で（毎ナビゲーションで）直接注入する。
    // これにより student がガードによって /onboarding へ強制リダイレクトされ、
    // 保護ページへバイパスできないことを確認する。
    const res = await request.post('/api/data/auth/login', {
      data: { email: 'student@teaching-eval.jp', password: 'password' },
    });
    const json = await res.json();
    const { user, token } = json;

    await context.addInitScript((authData) => {
      localStorage.setItem('token', authData.token);
      localStorage.setItem('auth_token', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
      localStorage.setItem('user_info', JSON.stringify(authData.user));
      // 未完了状態を毎ナビゲーションで強制的に維持（ガードの動作検証のため）
      localStorage.removeItem(`onboarding_done_${authData.user.id}`);
      localStorage.setItem('pending_onboarding', 'true');
    }, { user, token });

    // テストがリトライでハングしないよう cohorts API をモック
    await page.route('**/api/data/cohorts', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ cohorts: [] }),
      });
    });

    // 保護ページへアクセスしてもガードが /onboarding へ強制リダイレクトする
    const protectedRoutes = ['/dashboard', '/journals', '/growth', '/self-evaluation'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      // Router should force redirect to onboarding
      await expect(page).toHaveURL(/.*\/onboarding.*/);
    }

    // Check onboarding elements
    await expect(page.getByTestId('onboarding-page-root')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="初期設定"').first()).toBeVisible();
  });

  test('teacher skips onboarding and goes to dashboard', async ({ page }) => {
    // Teachers do not require onboarding
    await loginAs(page, { role: 'teacher', state: 'onboardingIncomplete' });
    
    // Should go to teacher dashboard
    await expect(page).toHaveURL(/.*\/teacher-dashboard.*/);
    await expect(page.getByTestId('teacher-dashboard-root')).toBeVisible();
  });

  test('admin skips onboarding and goes to admin dashboard', async ({ page }) => {
    // Admins do not require onboarding
    await loginAs(page, { role: 'admin', state: 'onboardingIncomplete' });
    
    // Should go to admin dashboard
    await expect(page).toHaveURL(/.*\/admin.*/);
    await expect(page.getByTestId('admin-dashboard-root')).toBeVisible();
  });

});
