import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

test.describe('SCAT Journal Integration & Network Analysis', () => {
  test('SCATBatchAnalysisPage basic interactions', async ({ page }) => {
    // ログイン (adminまたはresearcher)
    await loginAs(page, 'admin');

    // SCAT一括分析ページへ遷移
    await page.goto('/scat-batch');
    
    // UIが表示されていることの確認
    await expect(page.locator('text=SCAT一括分析')).toBeVisible();
    await expect(page.locator('text=選択した日誌を分析')).toBeVisible();

    // テーブルにモックデータが表示されていることを確認
    await expect(page.locator('text=山田 太郎').first()).toBeVisible();

    // 最初の行のチェックボックスをクリック
    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.check();

    // 「選択した日誌を分析 (1件)」ボタンが活性化しているか
    const runButton = page.locator('button', { hasText: /選択した日誌を分析 \(\d+件\)/ });
    await expect(runButton).toBeEnabled();

    // ※ここでは実際にAPI呼び出しをモックしてテストするのが望ましいが、ひとまずUIの反応を見る
    // await runButton.click();
    // await expect(page.locator('text=処理中...')).toBeVisible();
  });

  test('SCATNetworkAnalysisPage network rendering and CSV export', async ({ page }) => {
    await loginAs(page, 'admin');

    await page.goto('/scat-network');
    
    await expect(page.locator('text=SCAT概念ネットワーク')).toBeVisible();
    await expect(page.locator('text=対象期間').first()).toBeVisible();

    // canvas が描画されているか (react-force-graph-2d)
    const canvas = page.locator('[data-testid="network-canvas"]');
    await expect(canvas).toBeVisible();

    // CSVエクスポートボタンが存在し、クリック可能か
    const downloadButton = page.locator('button', { hasText: 'CSVエクスポート' });
    await expect(downloadButton).toBeEnabled();
    
    // 期間のセレクトボックスを開いて変更できるか
    const select = page.locator('div[role="combobox"]');
    await select.click();
    await page.locator('li[role="option"]', { hasText: '第1週' }).click();
    // ここでクエリが走って再描画されるはず
  });

  test('SCATTimelinePage timeline rendering and CSV export', async ({ page }) => {
    await loginAs(page, 'admin');

    await page.goto('/scat-timeline');
    
    await expect(page.locator('text=SCATテーマ時系列推移')).toBeVisible();

    // recharts の SVG が描画されているか
    const svg = page.locator('.recharts-surface').first();
    await expect(svg).toBeVisible();

    // CSVエクスポートボタンが存在し、クリック可能か
    const downloadButton = page.locator('button', { hasText: 'CSVエクスポート' });
    await expect(downloadButton).toBeEnabled();
  });
});
