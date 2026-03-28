import { Page, expect } from '@playwright/test';
import { seedTestUserState, TestUserOptions } from './seedTestUserState';

export async function loginAs(page: Page, options: TestUserOptions | 'student' | 'teacher' | 'admin' | 'researcher') {
  let role: string;
  let state = 'ready';

  if (typeof options === 'string') {
    role = options;
  } else {
    role = options.role;
    if (options.state) state = options.state;
  }

  // Seed user state before navigating
  await seedTestUserState(page, { role: role as any, state: state as any });

  await page.goto('/login');
  
  const roleTextMap: Record<string, string> = {
    student: '山田 太郎', // The student name from LoginPage.tsx
    teacher: '佐藤 花子',
    admin: '田中 管理者',
    researcher: '伊藤 研究者'
  };
  
  // The login page redirects depending on role (dashboard/teacher-dashboard/admin)
  // Let's click the card corresponding to the name
  await page.click(`text="${roleTextMap[role]}"`);
  
  // Wait for the login API and redirect
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

export async function expectLandingForState(page: Page, state: string, role: string) {
  if (state === 'onboardingIncomplete') {
    await expect(page).toHaveURL(/.*\/onboarding.*/);
  } else {
    if (role === 'student') await expect(page).toHaveURL(/.*\/dashboard.*/);
    else if (role === 'teacher') await expect(page).toHaveURL(/.*\/teacher-dashboard.*/);
    else if (role === 'admin') await expect(page).toHaveURL(/.*\/admin.*/);
  }
}
