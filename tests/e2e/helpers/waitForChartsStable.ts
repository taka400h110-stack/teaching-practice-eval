import { Page } from '@playwright/test';

export async function waitForChartsStable(page: Page) {
  const charts = page.locator('.recharts-wrapper, canvas, svg');
  if (await charts.count() > 0) {
    await charts.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  }
  await page.waitForTimeout(1000); // Allow animations to settle
}
