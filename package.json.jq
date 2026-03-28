const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('/home/user/webapp/package.json', 'utf8'));

pkg.scripts['test:e2e'] = 'playwright test';
pkg.scripts['test:e2e:role'] = 'playwright test tests/e2e/role-ui-audit.spec.ts tests/e2e/role-rbac-matrix.spec.ts';
pkg.scripts['test:e2e:export'] = 'playwright test tests/e2e/export-filter-audit.spec.ts';
pkg.scripts['test:e2e:stats'] = 'playwright test tests/e2e/statistics-validity.spec.ts';
pkg.scripts['test:e2e:visual'] = 'playwright test tests/e2e/visual-regression.spec.ts tests/e2e/visual-mobile.spec.ts';
pkg.scripts['test:ui:audit'] = 'npm run test:e2e:role && npm run test:e2e:export && npm run test:e2e:stats';

fs.writeFileSync('/home/user/webapp/package.json', JSON.stringify(pkg, null, 2));
