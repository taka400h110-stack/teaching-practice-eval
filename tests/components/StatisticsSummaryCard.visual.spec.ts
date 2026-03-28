import { test, expect } from '@playwright/test';
import { loginAs } from '../e2e/helpers/loginAs';

test.describe('Component Visual Regression - StatisticsSummaryCard', () => {

  test('Teacher Dashboard Summary Card Visual', async ({ page }) => {
    // Go to teacher dashboard where the component might be
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await page.goto('/teacher-statistics');
    
    // Check if the page is visible
    const root = page.locator('#root, [data-testid="statistics-page-root"]').first();
    await expect(root).toBeVisible({ timeout: 15000 });

    // Optional: Screenshot only the specific component if it has a unique class/testid
    // For now we just take the full page or default container
    await expect(page).toHaveScreenshot('teacher-statistics-card.png', {
      maxDiffPixelRatio: 0.1,
      fullPage: false
    });
  });
});
