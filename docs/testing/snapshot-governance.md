# Snapshot Governance

## Overview
This document outlines the governance model for visual regression testing. It defines responsibilities, acceptable tolerances, masking strategies, and the approval flow to ensure that snapshots accurately reflect the intended UI state.

## Baseline Update Approval Flow
- Developers can update baselines locally using `npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots`.
- Any baseline updates **MUST** be reviewed in a Pull Request.
- **Required Reviewers**: Tech Lead or designated UI Owner.
- **Reviewers must verify**:
  - The change in the snapshot is intentional.
  - No unintended layout breaks, text shifts, or styling regressions are introduced.

## Configuration Standards
We use pixel-based comparisons in Playwright, governed by the `maxDiffPixelRatio` to prevent flakiness:
- **Whole page updates**: maxDiffPixelRatio = 0.01 (1% allowance for rendering variations).
- **Component-level updates**: maxDiffPixelRatio = 0.005.
- Colors: Small color differences caused by anti-aliasing are ignored by default in Playwright's comparison.
- Shifts: Small 1-px shifts can be allowed via configuration or masked if consistently flaky.

## Dynamic Regions to Mask
To ensure snapshots are deterministic, the following dynamic elements must be masked (using Playwright's `mask` property or by injecting custom CSS to hide/replace them):
- Timestamps and relative dates (e.g., "Updated 2 mins ago")
- Randomly generated IDs or avatars
- Toasts / Snackbars / Notification popups
- Loading times or skeleton loaders
- Auto-generated chart labels containing random data
- Animated progress bars or spinners

## Update Process
1. Run local visual regression tests: `npm run test:e2e:visual`.
2. If tests fail, investigate the diff.
3. If the failure is due to an intentional UI change, update snapshots: `npm run test:e2e:visual -- --update-snapshots`.
4. Push to your branch and create a Pull Request.
5. Provide before/after visual context in the PR description.
6. Await review and approval.
7. Merge and verify the scheduled Nightly CI passes.
