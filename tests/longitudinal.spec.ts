import { test, expect } from '@playwright/test';

test('Longitudinal page loads without crashing and displays correct state', async ({ page }) => {
  await page.goto('/login');
  await page.click('text="研究者"');
  await page.waitForURL('**/dashboard*');
  await page.goto('/longitudinal');

  const heading = page.locator('h5:has-text("縦断分析・成長軌跡（RQ3a）")');
  await expect(heading).toBeVisible();

  const tabs = page.locator('button[role="tab"]');
  await expect(tabs).toHaveCount(6);

  await page.click('button:has-text("LCGA（クラス分類）")');

  const alert = page.locator('div[role="alert"]:has-text("LCGA は外部分析前提です")');
  await expect(alert).toBeVisible();

  await page.click('button:has-text("サンプル表示を確認")');
  const sampleAlert = page.locator('div[role="alert"]:has-text("サンプル表示")');
  await expect(sampleAlert).toBeVisible();
});

test('LGCM state renders correctly', async ({ page }) => {
  await page.goto('/login');
  await page.click('text="研究者"');
  await page.waitForURL('**/dashboard*');
  await page.goto('/longitudinal');

  await page.click('button:has-text("LGCM結果")');
  await page.click('button:has-text("LGCM実行")');
  
  const noData = page.locator('div[role="alert"]:has-text("データ不足のため LGCM を実行できません")');
  const paramHeading = page.locator('text="LGCM パラメータ推定値"');
  
  await expect(noData.or(paramHeading)).toBeVisible({ timeout: 15000 });
});
