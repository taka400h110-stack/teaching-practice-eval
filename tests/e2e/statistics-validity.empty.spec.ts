import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';
import { mockReliabilityStats, mockLongitudinalStats } from './helpers/seedStatsFixtures';

test.describe('Statistics Validity Audit - Empty Fixtures', () => {

  test('ReliabilityAnalysisPage - Empty', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'statisticsEmpty' });
    await mockReliabilityStats(page, 'empty');
    await page.goto('/reliability');
    
    const root = page.locator('#root, [data-testid="statistics-page-root"]');
    await expect(root).toBeVisible();
    // Verify fallback or empty state (e.g. data-testid="fallback-no-data-alert")
  });

  test('LongitudinalAnalysisPage - Empty', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'statisticsEmpty' });
    await mockLongitudinalStats(page, 'empty');
    await page.goto('/longitudinal');
    
    const root = page.locator('#root, [data-testid="statistics-page-root"]');
    await expect(root).toBeVisible();
  });

  test('SCATAnalysisPage - Empty', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'statisticsEmpty' });
    await page.goto('/scat');
    
    const root = page.locator('#root, [data-testid="statistics-page-root"]');
    await expect(root).toBeVisible();
  });
});
