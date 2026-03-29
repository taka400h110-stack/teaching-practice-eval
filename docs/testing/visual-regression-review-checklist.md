# Visual Regression Review Checklist

When reviewing a PR that updates visual snapshots (`*.png` files in the Playwright snapshot directory), please verify the following:

- [ ] **Intentional Change**: Is the visual change expected and documented in the PR?
- [ ] **Dynamic Elements**: Are all dynamic contents (dates, IDs, tooltips) properly masked or mocked?
- [ ] **Tolerances**: Are the diff limits respected (`maxDiffPixelRatio` <= 0.01)?
- [ ] **Responsive**: Does the UI look correct on both Desktop and Mobile viewports?
- [ ] **Isolation**: Were unchanged pages or components unaffected by the CSS/Layout updates?
- [ ] **Readability**: Are text, contrast, and alignment correct in the new snapshot?
