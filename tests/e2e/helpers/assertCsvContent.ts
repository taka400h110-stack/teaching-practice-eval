import { expect } from '@playwright/test';

export function assertCsvContent(content: string, expectedHeaders: string[], expectedRowCount?: number): string[] {
  // Check UTF-8 BOM
  expect(content.charCodeAt(0)).toBe(0xFEFF);
  
  // Strip BOM for further checks
  const strippedContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
  
  const lines = strippedContent.trim().split('\n');
  expect(lines.length).toBeGreaterThan(0);
  
  const headerLine = lines[0];
  for (const header of expectedHeaders) {
    expect(headerLine).toContain(header);
  }
  
  if (expectedRowCount !== undefined) {
    expect(lines.length - 1).toBe(expectedRowCount);
  }

  return lines;
}
