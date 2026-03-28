import { Page, expect } from '@playwright/test';
import { waitForChartsStable } from './waitForChartsStable';

export async function prepareStableUi(page: Page) {
  // Wait for fonts
  await page.evaluate(() => document.fonts.ready);
  
  // Wait for loading spinners/skeletons to disappear
  const skeletons = page.locator('.MuiSkeleton-root, .MuiCircularProgress-root, [role="progressbar"]');
  // Just wait for the first one to disappear if it exists
  await skeletons.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  
  // Stop animations
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }
    `
  });

  // Wait for charts
  await waitForChartsStable(page);
  
  // Dismiss snackbars/toasts if any
  const closeButton = page.locator('.MuiSnackbar-root button[aria-label="close"]');
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click().catch(() => {});
  }
}
