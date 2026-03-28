import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/loginAs';

test('debug teacher login', async ({ page }) => {
  await loginAs(page, { role: 'teacher', state: 'onboardingComplete' });
  const userInfo = await page.evaluate(() => window.localStorage.getItem("user_info"));
  console.log("USER INFO:", userInfo);
  console.log("URL:", page.url());
});
