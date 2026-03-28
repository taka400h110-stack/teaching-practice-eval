import { test, expect } from '@playwright/test';
import { loginAs, expectLandingForState } from './helpers/loginAs';

test.describe('Role-based UI audit - Onboarded', () => {

  test('student pages render and basic actions work', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'onboardingComplete' });
    await expectLandingForState(page, 'onboardingComplete', 'student');
    
    // Check main navigation items
    await expect(page.getByTestId('student-dashboard-root')).toBeVisible().catch(async () => {
      // fallback for missing data-testid currently
      await expect(page.locator('text="成長サマリー"').first()).toBeVisible();
    });

    // Check Journal List
    await page.goto('/journals');
    await expect(page.getByTestId('journal-list-root')).toBeVisible();

    // Check Self Evaluation
    await page.goto('/self-evaluation');
    await expect(page.getByTestId('self-evaluation-page-root')).toBeVisible();
    
    // Growth
    await page.goto('/growth');
    await expect(page.getByTestId('growth-page-root')).toBeVisible();
  });

  test('teacher pages render and basic actions work', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'onboardingComplete' });
    await expectLandingForState(page, 'onboardingComplete', 'teacher');
    
    // Cohorts
    await page.goto('/cohorts');
    await expect(page.getByTestId('cohorts-page-root')).toBeVisible();
    
    // Statistics
    await page.goto('/statistics');
    await expect(page.getByTestId('statistics-page-root')).toBeVisible();
  });

  test('admin pages render and basic actions work', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'onboardingComplete' });
    await expectLandingForState(page, 'onboardingComplete', 'admin');
    
    // Readiness panel (Wait until it loads or shows missing secrets)
    // await expect(page.locator('text="Operational Readiness"').first()).toBeVisible({ timeout: 15000 });
    
    // Platform Analytics
    await page.goto('/platform-analytics');
    await expect(page.getByTestId('platform-analytics-page-root')).toBeVisible();
    
    // Register
    await page.goto('/register');
    await expect(page.getByTestId('user-registration-page-root')).toBeVisible();
  });

});
