import { test, expect } from '@playwright/test';

const TEST_USERS = {
  student: { id: 'test-student', role: 'student', name: '学生' },
  teacher: { id: 'test-teacher', role: 'univ_teacher', name: '大学教員' },
  researcher: { id: 'test-researcher', role: 'researcher', name: '研究者' },
  admin: { id: 'test-admin', role: 'admin', name: '管理者' },
};

async function setLoginState(page, user) {
  // Catch all API requests to avoid 401s from the real backend during test
  await page.route('**/api/**', route => route.fulfill({ status: 200, json: { data: [] } }));
  
  await page.goto('/');
  await page.evaluate((u) => {
    localStorage.setItem('user_info', JSON.stringify({ ...u, roles: [u.role] }));
    localStorage.setItem('auth_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMwMDAwMDAwMDB9.invalid');
    localStorage.removeItem('pending_onboarding');
  }, user);
}

test.describe('Route Access Tests', () => {

  test('Unauthenticated user should redirect to login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.goto('/dashboard');
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Student cannot access researcher longitudinal page', async ({ page }) => {
    await setLoginState(page, TEST_USERS.student);
    await page.goto('/longitudinal');
    await page.waitForURL('**/unauthorized');
    await expect(page.locator('text=403 Forbidden')).toBeVisible();
  });

  test('Researcher can access longitudinal page', async ({ page }) => {
    await setLoginState(page, TEST_USERS.researcher);
    await page.goto('/longitudinal');
    await expect(page.locator('text=403 Forbidden')).not.toBeVisible();
    await expect(page).toHaveURL(/.*\/longitudinal/);
  });

  test('Teacher cannot access register page', async ({ page }) => {
    await setLoginState(page, TEST_USERS.teacher);
    await page.goto('/register');
    await page.waitForURL('**/unauthorized');
    await expect(page.locator('text=403 Forbidden')).toBeVisible();
  });

  test('Admin can access register page', async ({ page }) => {
    await setLoginState(page, TEST_USERS.admin);
    await page.goto('/register');
    await expect(page.locator('text=403 Forbidden')).not.toBeVisible();
    // It should render the registration page
    await expect(page.locator('text=ユーザー登録管理').first()).toBeVisible();
  });
});
