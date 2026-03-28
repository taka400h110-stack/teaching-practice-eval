import { Page, expect } from '@playwright/test';

export async function assertChartSeriesCount(page: Page, expectedCount: number) {
  // Assumes Recharts where series are represented by paths or legends
  // In Recharts, lines are usually `path.recharts-line-curve` or similar
  const lines = page.locator('path.recharts-line-curve, .recharts-bar-rectangle');
  await expect(lines).toHaveCount(expectedCount);
}
