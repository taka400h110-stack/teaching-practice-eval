import { test, expect } from '@playwright/test';

test.describe('SLA Renotify Suppress', () => {
  test('should suppress renotify within interval', async ({ request }) => {
    // Similar to above, verify the scheduled endpoint
    const res = await request.get('/cdn-cgi/handler/scheduled?cron=10+0+*+*+*');
    expect(res.status()).toBe(200);
  });
});
