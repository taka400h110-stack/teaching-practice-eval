# Test User State Matrix

| Role | Seed State | Expected Landing | Available Pages | Expected UI Condition |
|---|---|---|---|---|
| student | `onboardingIncomplete` | `/onboarding` | Only onboarding | Must complete setup |
| student | `onboardingComplete` | `/dashboard` | Journals, Eval, Growth | Shows empty or populated states |
| teacher | `onboardingComplete` | `/teacher-dashboard` | Cohorts, Statistics | Empty/Populated |
| admin | `ready` | `/admin` | Readiness, Logs | System operations |
| admin | `statisticsPopulated` | `/admin` | All Stats Pages | Charts and valid data shown |
| admin | `statisticsEmpty` | `/admin` | All Stats Pages | No-data fallbacks shown |
