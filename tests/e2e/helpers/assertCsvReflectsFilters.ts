import { expect } from '@playwright/test';

export function assertCsvReflectsFilters(csvLines: string[], filterColumnIndex: number, expectedValue: string) {
  // skip header
  const dataRows = csvLines.slice(1);
  for (const row of dataRows) {
    if (!row.trim()) continue;
    const columns = row.split(',');
    // simplistic check
    expect(columns[filterColumnIndex]).toContain(expectedValue);
  }
}
