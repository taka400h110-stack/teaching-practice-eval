import { test, expect } from '@playwright/test';
import { loginAs, expectLandingForState } from './helpers/loginAs';

test.describe('Role-based UI audit - Not Onboarded', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  });

  test('student is redirected to onboarding and cannot bypass it', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'onboardingIncomplete' });
    await expectLandingForState(page, 'onboardingIncomplete', 'student');
    await expect(page.getByTestId('onboarding-page-root')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="初期設定"').first()).toBeVisible();

    const protectedRoutes = ['/dashboard', '/journals', '/growth', '/self-evaluation'];
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/.*\/onboarding.*/);
    }
  });

  test('teacher skips onboarding and goes to dashboard', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'onboardingIncomplete' });
    await expect(page).toHaveURL(/.*\/teacher-dashboard.*/);
    await expect(page.getByTestId('teacher-dashboard-root')).toBeVisible();
  });

  test('admin skips onboarding and goes to admin dashboard', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'onboardingIncomplete' });
    await expect(page).toHaveURL(/.*\/admin.*/);
    await expect(page.getByTestId('admin-dashboard-root')).toBeVisible();
  });

});
