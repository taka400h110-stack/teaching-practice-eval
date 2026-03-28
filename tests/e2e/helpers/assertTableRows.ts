import { Page, expect } from '@playwright/test';

export async function assertTableRows(page: Page, expectedRowCount: number) {
  // Wait for the table body rows
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(expectedRowCount);
}
