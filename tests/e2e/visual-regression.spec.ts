import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';
import { prepareStableUi } from './helpers/prepareStableUi';
import { getDynamicRegions } from './helpers/maskDynamicRegions';
import { getVisualThreshold } from './helpers/visualThresholds';

test.describe('Visual Regression (Desktop)', () => {
  test.skip(({ isMobile }) => isMobile, 'Desktop only');

  test('Admin Dashboard visual regression', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('admin-dashboard-desktop.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('desktop')
    });
  });

  test('Teacher Dashboard visual regression', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/teacher-dashboard');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('teacher-dashboard-desktop.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('desktop')
    });
  });

  test('Student Dashboard visual regression', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/dashboard');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('student-dashboard-desktop.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('desktop')
    });
  });

  test('Reliability Analysis visual regression', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/reliability');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('reliability-analysis-desktop.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('chart')
    });
  });

  test('Longitudinal Analysis visual regression', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/longitudinal');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('longitudinal-analysis-desktop.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('chart')
    });
  });

  test('Journal Editor visual regression', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/journals/new');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('journal-editor-desktop.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('desktop')
    });
  });
});
