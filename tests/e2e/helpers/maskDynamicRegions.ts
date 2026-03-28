import { Page, Locator } from '@playwright/test';

export function getDynamicRegions(page: Page): Locator[] {
  return [
    page.locator('time'),
    page.locator('.timestamp'),
    page.locator('[data-testid="last-updated"]')
  ];
}
