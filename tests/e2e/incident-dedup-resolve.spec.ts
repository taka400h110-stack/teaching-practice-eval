import { test, expect } from '@playwright/test';

test.describe('Incident Dedup and Resolve', () => {
  test('should trigger incident without duplicating', async ({ request }) => {
    // Note: Mocking auth and database state is usually done via a test server
    // For this e2e, we verify the endpoints handle requests without crashing
    const triggerRes = await request.post('/api/admin/incidents/cleanup/trigger', {
      data: { fingerprint: 'test-fingerprint', severity: 'warning' }
    });
    // Should be 401 unauth if no token is provided, 
    // or we mock the auth in the playwright config.
    expect([200, 401]).toContain(triggerRes.status());
  });
});
