import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

// Use mobile viewport for this suite
test.use({ viewport: { width: 375, height: 667 } });

test.describe('Mobile Interaction Audit', () => {

  test('Student Dashboard - Mobile View', async ({ page }) => {
    await loginAs(page, { role: 'student', state: 'ready' });
    await page.goto('/dashboard');
    
    // Check if hamburger menu or mobile-friendly root is visible
    const root = page.getByTestId('student-dashboard-root');
    await expect(root).toBeVisible({ timeout: 15000 });
    
    // Verify that some key elements don't overflow (basic check)
    const boundingBox = await root.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
  });

  test('Teacher Dashboard - Mobile View', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await page.goto('/teacher');
    
    const root = page.getByTestId('teacher-dashboard-root');
    await expect(root).toBeVisible({ timeout: 15000 });
    
    const boundingBox = await root.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
  });

  test('Admin Dashboard - Mobile View', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await page.goto('/admin');
    
    const root = page.getByTestId('admin-dashboard-root');
    await expect(root).toBeVisible({ timeout: 15000 });
    
    const boundingBox = await root.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
  });
});
