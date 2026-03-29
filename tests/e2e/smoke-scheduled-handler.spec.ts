import { test, expect } from '@playwright/test';
import { runScheduled } from './helpers/runScheduled';

test.describe('Scheduled Handler Smoke Tests', () => {
  test('cleanup cron executes and returns 200', async ({ request }) => {
    // Usually daily or specific interval
    const res = await runScheduled(request, '10 0 * * *');
    expect(res.status()).toBe(200);
  });

  test('escalation cron executes and returns 200', async ({ request }) => {
    // Escalation interval
    const res = await runScheduled(request, '*/15 * * * *');
    expect(res.status()).toBe(200);
  });
});
