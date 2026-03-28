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
    baseURL: 'http://localhost:8788',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    timezoneId: 'UTC',
    locale: 'ja-JP'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:8788',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
