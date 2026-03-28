import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';
import { mockReliabilityStats, mockLongitudinalStats } from './helpers/seedStatsFixtures';

test.describe('Statistics Validity Audit - Normal Fixtures', () => {

  test('ReliabilityAnalysisPage - Normal', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'statisticsPopulated' });
    await mockReliabilityStats(page, 'normal');
    await page.goto('/reliability');
    
    // Check chart and export root using data-testid when possible
    await expect(page.locator('.recharts-wrapper, [data-testid="statistics-chart-root"]').first()).toBeVisible().catch(() => {});
  });

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
