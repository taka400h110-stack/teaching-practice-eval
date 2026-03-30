import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginAs } from './helpers/loginAs';

const testDir = process.cwd();

test.describe('File Upload UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept the API to avoid actually running OCR backend
    await page.route('**/api/ocr/analyze', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          blocks: [{ text: 'Mocked text for docx', confidence: 99 }],
          overall_confidence: 99,
          ocr_source: 'vision',
          auto_rotated: false,
          brightness_adjusted: false
        })
      });
    });

    await loginAs(page, { role: 'student' });
    await page.goto('/ocr');
    
    // Wait for the button to be visible
    await page.waitForSelector('text=ギャラリーから選択', { state: 'visible', timeout: 30000 });
  });

  test('Single .docx upload works and displays correct name without garbling', async ({ page }) => {
    const filename = '実習の報告書　３年　 後期　　第３回　１０月６日.docx';
    const filePath = path.join(testDir, 'tests/fixtures/documents', filename);
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("ギャラリーから選択")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    
    // Wait for file to be listed
    await expect(page.getByText(filename)).toBeVisible();
    
    // Verify CSS handles long names
    // The filename might be truncated or placed inside a typography component with specific styles
    // Let's check the container of the text
    const textLocator = page.getByText(filename);
    await expect(textLocator).toHaveCSS('text-overflow', 'ellipsis');
    await expect(textLocator).toHaveCSS('overflow', 'hidden');
    await expect(textLocator).toHaveCSS('white-space', 'nowrap');
  });

  test('Upload succeeds with Japanese, long, and symbol-rich filenames', async ({ page }) => {
    const filename = '実習報告書の書式(初等教育実践研究Ａ).2017 3年　後期　　１２月１日　第１０回　報告書.docx';
    const filePath = path.join(testDir, 'tests/fixtures/documents', filename);
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("ギャラリーから選択")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    
    // Verify name is exactly preserved
    await expect(page.getByText(filename)).toBeVisible();
  });

  test('Multiple file upload works', async ({ page }) => {
    const files = ['①.docx', '④.docx', '実習の報告書　３年　 後期　　第５回　１０月２０日.docx'];
    const filePaths = files.map(f => path.join(testDir, 'tests/fixtures/documents', f));
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("ギャラリーから選択")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePaths);
    
    // Check that all 3 are displayed
    for (const f of files) {
      await expect(page.getByText(f)).toBeVisible();
    }
  });

  test('Upload all ①-⑫ files together', async ({ page }) => {
    const files = Array.from({ length: 12 }, (_, i) => `\u2460`.charCodeAt(0) + i)
      .map(code => `${String.fromCharCode(code)}.docx`);
    
    const filePaths = files.map(f => path.join(testDir, 'tests/fixtures/documents', f));
    
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('button:has-text("ギャラリーから選択")').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePaths);
    
    // UI limits to 5 pages
    await expect(page.getByText('選択済み画像（5/5ページ）')).toBeVisible();
    for (let i = 0; i < 5; i++) {
      await expect(page.getByText(files[i])).toBeVisible();
    }
  });
});
