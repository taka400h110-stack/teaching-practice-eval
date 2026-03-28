import { test, expect } from '@playwright/test';

// Playwright test configuration to run against the scheduled handler
test.describe('Cron Scheduled Routing', () => {
  test('should execute scheduled handler for */15 * * * *', async ({ request }) => {
    // Cloudflare Workers Local development provides /cdn-cgi/handler/scheduled
    const res = await request.get('/cdn-cgi/handler/scheduled?cron=*/15+*+*+*+*');
    expect(res.status()).toBe(200);
    // Ideally we would assert the result text or side effects in DB
  });
});
