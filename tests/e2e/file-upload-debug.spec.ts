import { test, expect } from '@playwright/test';
import path from 'path';
import { loginAs } from './helpers/loginAs';

const testDir = process.cwd();

test('Debug file upload', async ({ page }) => {
  await loginAs(page, { role: 'student' });
  await page.goto('/ocr');
  await page.waitForSelector('text=ギャラリーから選択');
  
  const filename = '実習の報告書　３年　 後期　　第３回　１０月６日.docx';
  const filePath = path.join(testDir, 'tests/fixtures/documents', filename);
  
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.locator('button:has-text("ギャラリーから選択")').click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(filePath);
  
  await page.waitForTimeout(2000);
  const text = await page.locator('.MuiTypography-caption').textContent();
  console.log("RENDERED TEXT:", text);
});
