import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';
import { mockReliabilityStats, mockLongitudinalStatsMalformed, mockTeacherStatsMalformed } from './helpers/seedStatsFixtures';

test.describe('Statistics Validity Audit - Malformed Fixtures', () => {

  test('ReliabilityAnalysisPage - Malformed', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await mockReliabilityStats(page, 'malformed');
    await page.goto('/reliability');
    
    // Page layout (navigation, etc) should remain intact even if main content fails
    await expect(page.getByRole('banner')).toBeVisible({ timeout: 15000 });
    // It might show error boundary, or empty main, or header
    const mainHasContent = await page.locator('main').count();
    expect(mainHasContent).toBeGreaterThanOrEqual(1);
  });

  test('LongitudinalAnalysisPage - Malformed', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await mockLongitudinalStatsMalformed(page);
    await page.goto('/longitudinal');
    
    await expect(page.getByRole('banner')).toBeVisible({ timeout: 15000 });
    const mainHasContent = await page.locator('main').count();
    expect(mainHasContent).toBeGreaterThanOrEqual(1);
  });

  test('TeacherStatisticsPage - Malformed', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await mockTeacherStatsMalformed(page);
    await page.goto('/teacher-statistics');
    
    await expect(page.getByRole('banner')).toBeVisible({ timeout: 15000 });
    const mainHasContent = await page.locator('main').count();
    expect(mainHasContent).toBeGreaterThanOrEqual(1);
  });

  test('SCATAnalysisPage - Malformed', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await page.route('**/api/stats/scat', async (route) => {
      await route.fulfill({ json: { invalidData: true, count: -5 } });
    });
    await page.goto('/scat');
    
    await expect(page.getByRole('banner')).toBeVisible({ timeout: 15000 });
    const mainHasContent = await page.locator('main').count();
    expect(mainHasContent).toBeGreaterThanOrEqual(1);
  });
});
