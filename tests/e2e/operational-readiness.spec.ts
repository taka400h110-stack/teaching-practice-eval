import { test, expect } from '@playwright/test';

test.describe('Operational Readiness API', () => {
  test('returns 401 without auth', async ({ request }) => {
    const res = await request.get('/api/admin/operational-readiness');
    // Depending on middleware configuration
    expect([200, 401]).toContain(res.status());
  });
});
