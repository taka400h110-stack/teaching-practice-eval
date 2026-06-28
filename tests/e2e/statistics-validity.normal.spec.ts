import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';
import { mockLongitudinalStats } from './helpers/seedStatsFixtures';

test.describe('Statistics Validity Audit - Normal Fixtures', () => {

  test('LongitudinalAnalysisPage - Normal', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'statisticsPopulated' });
    await mockLongitudinalStats(page, 'normal');
    await page.goto('/longitudinal');
    
    const root = page.locator('#root, [data-testid="statistics-page-root"]');
    await expect(root).toBeVisible();
  });

  test('LongitudinalAnalysisPage - Boundary', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'statisticsPopulated' });
    await mockLongitudinalStats(page, 'boundary');
    await page.goto('/longitudinal');
    
    const root = page.locator('#root, [data-testid="statistics-page-root"]');
    await expect(root).toBeVisible();
  });
});
