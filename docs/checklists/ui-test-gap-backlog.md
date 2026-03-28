# UI Test Gap Backlog

This document tracks known gaps in the UI test coverage and serves as a backlog for future quality improvements.

## High Priority (P1)
- [ ] **RBAC × Direct URL Access × Mobile**: Ensure that URL manipulation on mobile views correctly enforces role-based access control and redirects appropriately without layout breaks.
- [ ] **Export Consistency after complex filters**: Verify that applying multiple filters (date range + cohort + search) correctly propagates to the CSV export across all statistics pages.
- [ ] **Admin/Provider Health - Degraded State UI**: Implement tests for partial failure states in the admin analytics/provider integrations (e.g. 1 provider down, 1 healthy) and ensure the UI conveys the degraded state correctly.
- [ ] **Chart Legend Wrapping**: Test data with extremely long names (e.g. long cohort names) to ensure chart legends wrap cleanly and don't break the layout.

## Medium Priority (P2)
- [ ] **Component-level Visual Regression**: Set up Storybook or isolate components in Playwright to take visual snapshots of individual MUI components (cards, tables) to detect minor CSS changes.
- [ ] **Long-running Statistics Fixtures**: Add tests simulating large datasets (e.g. 10,000+ records) to check frontend rendering performance and timeout handling.
- [ ] **Nightly Job Dashboard Consistency**: E2E test to verify that the dashboard reflects the correct numerical aggregates before and after the simulated `export-cleanup` scheduled job runs.

## Low Priority (P3)
- [ ] **Performance Budget / Lighthouse**: Integrate `@playwright/test` with Lighthouse or performance API to assert time-to-interactive (TTI) and First Contentful Paint (FCP) on key pages.
- [ ] **Accessibility (a11y) Audits**: Introduce `axe-core` to run basic WCAG compliance checks on all major dashboards.
- [ ] **Dark Mode Baseline**: Setup visual snapshots for the dark mode theme if supported in the future.
