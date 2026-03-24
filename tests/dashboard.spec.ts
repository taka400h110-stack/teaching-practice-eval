import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('should load without crashing when data is empty', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('onboarding_done_student-001', 'true');
      localStorage.setItem('onboarding_done_student', 'true');
    });

    await page.route('**/api/data/journals*', async route => {
      await route.fulfill({ json: { journals: [] } });
    });
    await page.route('**/api/data/growth/*', async route => {
      await route.fulfill({ json: { student_id: 'test', weekly_scores: [] } });
    });
    await page.route('**/api/data/goals/*', async route => {
      await route.fulfill({ json: { goals: [] } });
    });
    await page.route('**/api/data/self-evals/*', async route => {
      await route.fulfill({ json: { self_evaluations: [] } });
    });

    await page.click('text="実習生"');

    await page.waitForURL('**/dashboard*');
    
    // Check if the empty state message actually appears
    await expect(page.locator('text="まだ日誌がありません"').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text="まだ目標がありません"').first()).toBeVisible();
  });
});
