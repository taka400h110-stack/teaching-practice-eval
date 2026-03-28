import { Page, expect } from '@playwright/test';

export async function assertStatCardValue(page: Page, label: string | RegExp, expectedValue: string) {
  // Find a card/box containing the label, then check its value.
  // Assumes a typical structure where label and value are siblings or inside a card.
  const container = page.locator('.MuiCard-root, .MuiPaper-root').filter({ hasText: label });
  await expect(container.first()).toContainText(expectedValue);
}
