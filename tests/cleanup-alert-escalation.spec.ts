import { test, expect } from '@playwright/test';

test.describe('Cleanup Alert Escalation API', () => {
  test('Get escalations requires auth', async ({ request }) => {
    const res = await request.get('/api/admin/alerts/cleanup-failure/escalations?fingerprint=test');
    expect(res.status()).toBe(401);
  });
});
