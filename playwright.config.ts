import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  timeout: 120000,
  expect: { timeout: 10000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://127.0.0.1:8788',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
    locale: 'ja-JP',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],

  webServer: {
    // CI 環境では AI バインディングを除外した CI 専用 wrangler config を使用
    // (Cloudflare API token なしでも起動可能にするため)
    command: process.env.CI
      ? 'npm run build && npm run db:migrate:local && npm run preview:ci'
      : 'npm run build && npm run db:migrate:local && npm run preview',
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
