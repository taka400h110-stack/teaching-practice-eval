import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

test.describe('Role Analytics Audit', () => {

  test('researcher analytics pages render with fallback', async ({ page }) => {
    await loginAs(page, 'researcher');

    // Longitudinal
    await page.goto('/longitudinal');
    await expect(page.locator('h5:has-text("縦断分析")').first()).toBeVisible();

    // SCAT
    await page.goto('/scat');
    await expect(page.locator('h5:has-text("SCAT")').first()).toBeVisible();

    // Advanced Analytics
    await page.goto('/advanced-analytics');
    await expect(page.locator('text="高度分析"').first()).toBeVisible();
    // Fallback/No data
    await expect(page.locator('text="実行する分析ジョブを選択してください"').first().or(page.locator('text="新しいジョブを実行"'))).toBeVisible();
  });

});
