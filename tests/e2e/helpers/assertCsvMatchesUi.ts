import { Page, expect } from '@playwright/test';

export async function assertCsvMatchesUi(page: Page, csvRows: string[], options: { expectedCount?: number, expectedFilters?: string[] }) {
  if (options.expectedCount !== undefined) {
    // subtract header row
    const dataRowCount = csvRows.length - 1;
    expect(dataRowCount).toBe(options.expectedCount);
  }

  if (options.expectedFilters && options.expectedFilters.length > 0) {
    const dataRows = csvRows.slice(1);
    for (const filterValue of options.expectedFilters) {
      // Every data row should contain the filter value, or at least check if it makes sense.
      // Often, the specific column matches. Here we just do a simplistic check.
      const match = dataRows.every(row => row.includes(filterValue));
      if (!match) {
        throw new Error(`CSV data row missing expected filter value: ${filterValue}`);
      }
    }
  }
}
