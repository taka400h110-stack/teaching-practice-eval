import { test, expect } from '@playwright/test';

test.describe('Cleanup Alert Comments API', () => {
  test('Requires auth to get comments', async ({ request }) => {
    const res = await request.get('/api/admin/alerts/cleanup-failure/comments?fingerprint=test');
    expect(res.status()).toBe(401);
  });
});
