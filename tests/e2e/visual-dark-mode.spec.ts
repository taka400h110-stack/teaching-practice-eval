import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

// Emulate dark mode globally for this suite
test.use({ colorScheme: 'dark' });

test.describe('Dark Mode Visual Regression', () => {

  test('Student Dashboard - Dark Mode', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/dashboard');
    
    await expect(page.getByTestId('student-dashboard-root')).toBeVisible({ timeout: 15000 });
    
    // Mask dynamic content if necessary
    await expect(page).toHaveScreenshot('student-dashboard-dark.png', {
      maxDiffPixelRatio: 0.1,
      fullPage: true,
      mask: [page.locator('.dynamic-content')]
    });
  });

  test('Teacher Statistics - Dark Mode', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await page.goto('/teacher-statistics');
    
    const root = page.locator('#root, [data-testid="statistics-page-root"]').first();
    await expect(root).toBeVisible({ timeout: 15000 });
    
    await expect(page).toHaveScreenshot('teacher-statistics-dark.png', {
      maxDiffPixelRatio: 0.1,
      fullPage: true
    });
  });

});
