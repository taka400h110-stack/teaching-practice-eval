const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const errors = [];
  page.on('pageerror', error => {
    errors.push('PAGE ERROR: ' + error.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push('CONSOLE ERROR: ' + msg.text());
    }
  });

  await page.goto('http://localhost:3000/login');
  
  // Login as super admin to see all menus if possible, or just system admin
  await page.click('text=システム管理者');
  await page.waitForTimeout(1000);

  const paths = [
    '/dashboard',
    '/teacher-dashboard',
    '/admin',
    '/journals',
    '/journals/new',
    '/journal-workflow',
    '/evaluations',
    '/evaluations/journal-001',
    '/evaluations/journal-001/human',
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

  for (const path of paths) {
    const url = `http://localhost:3000${path}`;
    console.log(`Navigating to ${url}`);
    
    // Clear previous errors
    errors.length = 0;
    
    await page.goto(url);
    await page.waitForTimeout(1000);
    
    const content = await page.content();
    const isBlank = content.includes('id="root"></div>') && content.length < 500;
    const hasError = content.includes('Something went wrong') || content.includes('エラー');
    
    console.log(`- Length: ${content.length}`);
    console.log(`- Is Blank: ${isBlank}`);
    console.log(`- Console/Page Errors: ${errors.length > 0 ? errors.join(', ') : 'None'}`);
  }
  
  await browser.close();
})();
