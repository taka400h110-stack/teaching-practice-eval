import { Page, expect, Download } from '@playwright/test';

export async function assertDownloadStarted(page: Page, triggerLocator: any, expectedFilenameRegex: RegExp = /.*/): Promise<Download> {
  const downloadPromise = page.waitForEvent('download');
  await triggerLocator.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(expectedFilenameRegex);
  return download;
}
