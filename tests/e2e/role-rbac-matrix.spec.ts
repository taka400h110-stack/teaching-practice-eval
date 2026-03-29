import { test, expect, Page } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

async function checkAccess(page: Page, path: string, allowed: boolean) {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
  
  if (allowed) {
    const isForbidden = await page.locator('text="403 Forbidden"').isVisible();
    expect(isForbidden).toBe(false);
  } else {
    try {
      await expect(page.locator('text="403 Forbidden"')).toBeVisible({ timeout: 3000 });
    } catch {
      const isRedirected = page.url().endsWith('/dashboard') || page.url().endsWith('/teacher-dashboard') || page.url().endsWith('/admin') || page.url().endsWith('/onboarding') || page.url().endsWith('/unauthorized');
      expect(isRedirected).toBe(true);
    }
  }
}

test.describe('Role RBAC Matrix', () => {

  test('student access matrix', async ({ page }) => {
    await loginAs(page, 'student');
    // Allowed
    await checkAccess(page, '/journals', true);
    await checkAccess(page, '/self-evaluation', true);
    // Denied
    await checkAccess(page, '/admin', false);
    await checkAccess(page, '/teacher-dashboard', false);
    await checkAccess(page, '/register', false);
    await checkAccess(page, '/cohorts', false);
  });

  test('teacher access matrix', async ({ page }) => {
    await loginAs(page, 'teacher');
    // Allowed
    await checkAccess(page, '/teacher-dashboard', true);
    await checkAccess(page, '/journals', true);
    await checkAccess(page, '/statistics', true);
    // Denied
    await checkAccess(page, '/admin', false);
    await checkAccess(page, '/register', false);
  });

  test('admin access matrix', async ({ page }) => {
    await loginAs(page, 'admin');
    // Allowed
    await checkAccess(page, '/admin', true);
    await checkAccess(page, '/platform-analytics', true);
    await checkAccess(page, '/register', true);
    // Denied (Usually admins shouldn't see student specific pages, though your routing might allow it. Let's check a student specific page)
    await checkAccess(page, '/self-evaluation', false);
  });

});
