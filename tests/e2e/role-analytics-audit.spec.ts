import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

test.describe('Role Analytics Audit', () => {

  test('researcher analytics pages render with fallback', async ({ page }) => {
    await loginAs(page, 'researcher');
    
    // Reliability
    await page.goto('/reliability');
    await expect(page.locator('h5:has-text("評価の信頼性分析")')).toBeVisible();
    // It should render some charts or a fallback message
    // Just ensuring no crash
    await expect(page.locator('text="Cohen\'s Kappa"').first().or(page.locator('text="ICC"').first())).toBeVisible();

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
    
    // International
    await page.goto('/international');
    await expect(page.locator('text="国際比較"').first()).toBeVisible();
  });

});
