import { test, expect } from '@playwright/test';

// In this file we would test the cron job trigger endpoint locally 
// via HTTP request to `/cdn-cgi/handler/scheduled` but Playwright typically
// tests the browser. We can use request.post to trigger the cron and assert.

const BASE_URL = 'http://localhost:8788';

test.describe('Export Cleanup Cron Jobs', () => {
  test('Trigger light cleanup cron', async ({ request }) => {
    // Cloudflare pages local dev supports scheduled testing.
    const res = await request.post(`${BASE_URL}/cdn-cgi/handler/scheduled`, {
      data: { cron: "*/15 * * * *" },
      headers: { "Content-Type": "application/json" }
    });
    // This assumes the local wrangler dev environment is running
    // The response code will be 200 if the scheduled handler doesn't throw
    expect(res.status()).toBe(200);
  });

  test('Trigger deep cleanup cron', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/cdn-cgi/handler/scheduled`, {
      data: { cron: "10 0 * * *" },
      headers: { "Content-Type": "application/json" }
    });
    expect(res.status()).toBe(200);
  });
});
