import { test, expect } from '@playwright/test';

// Define expected shapes and handle variations
test.describe('Statistics API Endpoints', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:8788';

  test('GET /api/stats/reliability - normal', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/stats/reliability`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('icc');
    expect(data).toHaveProperty('krippendorff');
  });

  test('GET /api/stats/longitudinal - normal', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/stats/longitudinal`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
  
  test('GET /api/stats/scat - normal', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/stats/scat`);
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('summary');
  });

});
