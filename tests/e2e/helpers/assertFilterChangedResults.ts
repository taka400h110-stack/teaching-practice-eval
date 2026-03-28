import { Page, Locator, expect } from '@playwright/test';

export async function assertFilterChangedResults(page: Page, filterAction: () => Promise<void>, resultLocator: Locator) {
  // Capture initial state text or count
  // E.g. get all text content from the result area
  await expect(resultLocator.first()).toBeVisible();
  const initialText = await resultLocator.allTextContents();
  
  await filterAction();
  
  // Wait for loading to finish if any
  const skeletons = page.locator('.MuiSkeleton-root, .MuiCircularProgress-root');
  if (await skeletons.count() > 0) {
    await skeletons.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
  
  // Verify state changed
  await expect(async () => {
    const newText = await resultLocator.allTextContents();
    expect(newText).not.toEqual(initialText);
  }).toPass({ timeout: 10000 });
}
