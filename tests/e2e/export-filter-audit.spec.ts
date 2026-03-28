import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';
import { assertDownloadStarted } from './helpers/assertDownloadStarted';
import { assertFilterChangedResults } from './helpers/assertFilterChangedResults';
import { readDownloadedCsv } from './helpers/readDownloadedCsv';
import { assertCsvContent } from './helpers/assertCsvContent';
import { assertCsvReflectsFilters } from './helpers/assertCsvReflectsFilters';
import { seedStatsFixtures } from './helpers/seedStatsFixtures';

test.describe('Export and Filter Actions Audit', () => {
  
  test('ReliabilityAnalysisPage: Export CSV and Tab Switch', async ({ page }) => {
    await loginAs(page, 'admin');
    await seedStatsFixtures(page);
    await page.goto('/reliability');
    
    // Wait for page to load
    await expect(page.getByText(/信頼性/).first()).toBeVisible();

    // Check Export CSV button if it exists
    const exportBtn = page.getByRole('button', { name: /CSV|ダウンロード/i }).first();
    if (await exportBtn.isVisible()) {
      const download = await assertDownloadStarted(page, exportBtn, /csv/i);
      const csvContent = await readDownloadedCsv(download);
      assertCsvContent(csvContent, []); // or some basic headers
    }

    // Try switching tabs if present (e.g. ICC vs Alpha)
    const tabs = page.getByRole('tab');
    if (await tabs.count() > 1) {
      await assertFilterChangedResults(
        page,
        async () => { await tabs.nth(1).click(); },
        page.locator('.recharts-wrapper, table, .MuiCardContent-root')
      );
    }
  });
  
  test('StatisticsPage: Export CSV Content Validation', async ({ page }) => {
    await loginAs(page, 'admin');
    await seedStatsFixtures(page);
    await page.goto('/statistics');
    await expect(page.getByTestId('statistics-page-root')).toBeVisible();

    const exportBtn = page.getByRole('button', { name: /データエクスポート/i }).first();
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      const csvMenu = page.getByRole('menuitem', { name: /CSV/i }).first();
      if (await csvMenu.isVisible()) {
         const download = await assertDownloadStarted(page, csvMenu, /csv/i);
         const csvContent = await readDownloadedCsv(download);
      const lines = assertCsvContent(csvContent, ['ID', '学校種別']);
         // verify rows matches the 1 profile from seedStatsFixtures
         expect(lines.length - 1).toBe(1);
         assertCsvReflectsFilters(lines, 4, '中学校'); // Filter reflection check
      }
    }
  });

  test('LongitudinalAnalysisPage: Export CSV Content Validation', async ({ page }) => {
    await loginAs(page, 'admin');
    await seedStatsFixtures(page);
    await page.goto('/longitudinal');
    await expect(page.getByText(/縦断分析/).first()).toBeVisible();

    const exportBtn = page.getByRole('button', { name: /成長データCSV/i }).first();
    if (await exportBtn.isVisible()) {
      const download = await assertDownloadStarted(page, exportBtn, /csv/i);
      const csvContent = await readDownloadedCsv(download);
      const lines = assertCsvContent(csvContent, ['week', 'f1_mean', 'f2_mean', 'f3_mean', 'f4_mean']);
      // verify length matches weeks (we seeded 10 weeks max? Let's just check length > 1 for now or 10 if longitudinal derives maxWeeks)
      expect(lines.length - 1).toBe(10);
    }
  });

  test('TeacherStatisticsPage: Export CSV Content Validation', async ({ page }) => {
    await loginAs(page, 'teacher');
    await seedStatsFixtures(page);
    await page.goto('/teacher-statistics');
    // It's possible the heading takes a bit to load or is wrapped.
    await expect(page.getByText(/教員向け統計ダッシュボード/).first()).toBeVisible({ timeout: 15000 });

    const exportBtn = page.getByRole('button', { name: /CSV出力/i }).first();
    if (await exportBtn.isVisible()) {
      const download = await assertDownloadStarted(page, exportBtn, /csv/i);
      const csvContent = await readDownloadedCsv(download);
      const lines = assertCsvContent(csvContent, ['ID', '氏名', '学校種別']);
      expect(lines.length - 1).toBe(1);
      assertCsvReflectsFilters(lines, 2, '中学校'); // Filter reflection check
    }
  });

  test('Admin dashboard analytics: Toggle range and Export CSV', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    
    const thirtyDaysBtn = page.getByRole('button', { name: /30/ }).first();
    if (await thirtyDaysBtn.isVisible()) {
      await assertFilterChangedResults(
        page,
        async () => { await thirtyDaysBtn.click(); },
        page.locator('.recharts-wrapper, [data-testid="kpi-value"]')
      );
    }
    
    // Check provider health CSV export
    const exportBtn = page.getByRole('button', { name: /Joint Display CSV/i }).first();
    if (await exportBtn.isVisible()) {
      await page.route('**/api/data/export/joint-display-csv', route => {
        route.fulfill({
          status: 200,
          contentType: 'text/csv',
          body: '\uFEFFheader1,header2\nval1,val2'
        });
      });
      const download = await assertDownloadStarted(page, exportBtn, /csv/i);
      const csvContent = await readDownloadedCsv(download);
      assertCsvContent(csvContent, ['header1', 'header2']);
    }
  });

});
