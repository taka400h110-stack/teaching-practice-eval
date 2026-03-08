const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  const routes = [
    '/dashboard',
    '/teacher-dashboard',
    '/admin',
    '/journals',
    '/journals/new',
    '/journal-workflow',
    '/evaluations',
    '/comparison',
    '/reliability',
    '/growth',
    '/longitudinal',
    '/statistics',
    '/cohorts',
    '/scat',
    '/self-evaluation',
    '/goals',
    '/chat',
    '/register',
    '/ocr',
    '/teacher-statistics',
    '/international'
  ];

  for (const route of routes) {
    console.log(`Testing ${route}...`);
    try {
      await page.goto(`http://localhost:3000${route}`, { waitUntil: 'networkidle', timeout: 5000 });
      await page.waitForTimeout(500); // Wait for React to render
    } catch (e) {
      console.log(`Failed to navigate to ${route}: ${e.message}`);
    }
  }

  console.log('Errors found:');
  console.log(errors.length > 0 ? errors.join('\n') : 'No errors');

  await browser.close();
})();
