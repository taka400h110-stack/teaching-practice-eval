import * as fs from 'fs';
export async function readDownloadedCsv(download: any): Promise<string> {
  const path = await download.path();
  return fs.readFileSync(path, 'utf-8');
}
