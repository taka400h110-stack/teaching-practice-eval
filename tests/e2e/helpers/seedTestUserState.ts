import { Page } from '@playwright/test';

export type UserRole = 'student' | 'teacher' | 'admin' | 'researcher';
export type UserState = 
  | 'onboardingIncomplete' 
  | 'onboardingComplete'
  | 'journalEmpty' 
  | 'journalPopulated'
  | 'statisticsEmpty'
  | 'statisticsPopulated'
  | 'ready';

export interface TestUserOptions {
  role: UserRole;
  state?: UserState;
}

export async function seedTestUserState(page: Page, options: TestUserOptions) {
  const state = options.state || 'ready';
  
  await page.addInitScript((seed) => {
    window.localStorage.setItem('TEST_SEED_ROLE', seed.role);
    window.localStorage.setItem('TEST_SEED_STATE', seed.state);
    
    // Direct manipulation of local storage for the demo app client
    if (seed.state === 'onboardingIncomplete') {
      if (seed.role === 'student') {
        window.localStorage.setItem('pending_onboarding', 'true');
      }
      window.localStorage.removeItem('onboarding_done_user-001');
      window.localStorage.removeItem('onboarding_done_user-002');
      window.localStorage.removeItem('onboarding_done_user-004');
    } else if (seed.state === 'onboardingComplete' || seed.state === 'ready' || seed.state.startsWith('statistics')) {
      window.localStorage.removeItem('pending_onboarding');
      window.localStorage.setItem('onboarding_done_user-001', 'true');
      window.localStorage.setItem('onboarding_done_user-002', 'true');
      window.localStorage.setItem('onboarding_done_user-004', 'true');
    }
  }, { role: options.role, state });

  // Example: mock onboarding status check API if the app uses one
  if (state === 'onboardingIncomplete') {
    await page.route('**/api/users/me', async route => {
      const response = await route.fetch();
      const json = await response.json().catch(() => ({}));
      json.onboardingCompleted = false;
      await route.fulfill({ json });
    });
  } else if (state === 'onboardingComplete' || state === 'ready') {
    await page.route('**/api/users/me', async route => {
      const response = await route.fetch();
      const json = await response.json().catch(() => ({}));
      json.onboardingCompleted = true;
      await route.fulfill({ json });
    });
  }

  // Mock /api/data/cohorts to avoid test hanging on retries
  await page.route('**/api/data/cohorts', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ cohorts: [] })
    });
  });
}
