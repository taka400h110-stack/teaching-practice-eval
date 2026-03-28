import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';
import { prepareStableUi } from './helpers/prepareStableUi';
import { getDynamicRegions } from './helpers/maskDynamicRegions';
import { getVisualThreshold } from './helpers/visualThresholds';

test.describe('Visual Regression (Mobile)', () => {
  test.skip(({ isMobile }) => !isMobile, 'Mobile only');

  test('Student Dashboard mobile snapshot', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/dashboard');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('student-dashboard-mobile.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('mobile')
    });
  });

  test('Journal Editor mobile snapshot', async ({ page }) => {
    await loginAs(page, 'student');
    await page.goto('/journals/new');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('journal-editor-mobile.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('mobile')
    });
  });

  test('Admin Dashboard mobile top-section snapshot', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/admin');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('admin-dashboard-mobile.png', {
      mask: getDynamicRegions(page),
      ...getVisualThreshold('mobile')
    });
  });

  test('Teacher Statistics mobile snapshot', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/teacher-statistics');
    await prepareStableUi(page);
    
    await expect(page).toHaveScreenshot('teacher-statistics-mobile.png', {
      mask: getDynamicRegions(page),
      fullPage: true,
      ...getVisualThreshold('mobile')
    });
  });
});
