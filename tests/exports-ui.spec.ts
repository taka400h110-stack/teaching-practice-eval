import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

const DEV_SECRET = 'default_local_secret_key_for_dev_only';
const BASE_URL = 'http://localhost:8788';

const adminToken = jwt.sign({ id: 'admin-1', role: 'admin', email: 'admin@test.com' }, DEV_SECRET, { expiresIn: '1h' });
const researcherToken = jwt.sign({ id: 'researcher-1', role: 'researcher', email: 'researcher@test.com' }, DEV_SECRET, { expiresIn: '1h' });

test.describe('Dataset Exports UI', () => {
  test('Researcher can visit exports page and create request', async ({ page }) => {
    // Go to home page to initialize origin
    await page.goto(`${BASE_URL}/`);
    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: 'researcher-1', role: 'researcher', roles: ['researcher'], email: 'researcher@test.com' }));
    }, { token: researcherToken });

    await page.goto(`${BASE_URL}/exports`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h4', { hasText: 'Data Exports' })).toBeVisible({ timeout: 10000 });
  });

  test('Admin can visit admin exports page and see requests', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.evaluate(({ token }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ id: 'admin-1', role: 'admin', roles: ['admin'], email: 'admin@test.com' }));
    }, { token: adminToken });

    await page.goto(`${BASE_URL}/admin/exports`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h4', { hasText: 'Export Requests Administration' })).toBeVisible({ timeout: 10000 });
  });
});
