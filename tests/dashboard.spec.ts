import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/data/growth/user-001', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ student_id: 'user-001', weekly_scores: [] }) });
    });
    await page.route('/api/data/journals*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ journals: [] }) });
    });
    await page.route('/api/data/goals/user-001', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ goals: [] }) });
    });
    await page.route('/api/data/self-evals/user-001', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ evaluations: [] }) });
    });
  });

  test('should load without crashing when data is empty', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user_info', JSON.stringify({ id: 'user-001', role: 'student', name: 'テスト学生', email: 'test@example.com' }));
      localStorage.setItem('auth_token', 'fake.eyJleHAiOjI1MjQ2MDgwMDB9.token');
      localStorage.removeItem('pending_onboarding');
    });
    
    await page.goto('/dashboard');
    await expect(page.locator('h6', { hasText: 'おかえりなさい' })).toBeVisible();
    await expect(page.locator('text=まだ日誌がありません')).toBeVisible();
  });
});

  test('should load without crashing when data is present', async ({ page }) => {
    // Override the routes for this specific test
    await page.route('/api/data/growth/user-001', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ student_id: 'user-001', weekly_scores: [{ week_number: 1, total: 10, factor1: 2, factor2: 3, factor3: 2, factor4: 3 }] }) });
    });
    await page.route('/api/data/journals*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ journals: [{ id: '1', title: 'テスト日誌', content: 'テスト', status: 'evaluated', date: '2023-10-01' }] }) });
    });

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('user_info', JSON.stringify({ id: 'user-001', role: 'student', name: 'テスト学生', email: 'test@example.com' }));
      localStorage.setItem('auth_token', 'fake.eyJleHAiOjI1MjQ2MDgwMDB9.token');
      localStorage.removeItem('pending_onboarding');
    });
    
    await page.goto('/dashboard');
    await expect(page.locator('h6', { hasText: 'おかえりなさい' })).toBeVisible();
    await expect(page.locator('text=テスト日誌')).toBeVisible();
  });
