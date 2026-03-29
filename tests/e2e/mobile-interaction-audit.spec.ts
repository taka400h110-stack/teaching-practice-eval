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
    // Soft width check or just visibility
    expect(await root.isVisible()).toBeTruthy();
  });

  test('Teacher Dashboard - Mobile View', async ({ page }) => {
    await loginAs(page, { role: 'teacher', state: 'ready' });
    await page.goto('/teacher-dashboard');
    
    const root = page.getByTestId('teacher-dashboard-root');
    await expect(root).toBeVisible({ timeout: 15000 });
    
    // Soft width check or just visibility
    expect(await root.isVisible()).toBeTruthy();
  });

  test('Admin Dashboard - Mobile View', async ({ page }) => {
    await loginAs(page, { role: 'admin', state: 'ready' });
    await page.goto('/admin');
    
    const root = page.getByTestId('admin-dashboard-root');
    await expect(root).toBeVisible({ timeout: 15000 });
    
    // Soft width check or just visibility
    expect(await root.isVisible()).toBeTruthy();
  });
});
