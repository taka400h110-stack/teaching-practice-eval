const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const researcherToken = jwt.sign({ id: 'researcher-1', role: 'researcher', email: 'researcher@test.com' }, 'default_local_secret_key_for_dev_only', { expiresIn: '1h' });

  await page.goto('http://localhost:8788/');
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ id: 'researcher-1', role: 'researcher', email: 'researcher@test.com', roles: ['researcher'] }));
  }, researcherToken);
  
  await page.goto('http://localhost:8788/exports');
  
  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());
  const body = await page.content();
  console.log('Body length:', body.length);
  if (body.includes('Data Exports')) console.log('Found Data Exports');
  else console.log('Did not find Data Exports');

  await browser.close();
})();
