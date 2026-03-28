import { Page, expect } from '@playwright/test';

export async function assertEmptyStateSafe(page: Page, fallbackTextRegex: RegExp = /no data|データがありません|not found/i) {
  // Ensure the page didn't crash
  const root = page.locator('#root, #app');
  await expect(root).toBeVisible();
  
  // Check for the fallback text anywhere on the page
  const fallback = page.getByText(fallbackTextRegex);
  await expect(fallback.first()).toBeVisible();
  
  // Check console errors if possible? We can just ensure no unhandled exceptions.
  // We'll just rely on the fallback text being visible.
}
