// Verify /chat (no journalId) now renders a session picker, not a dead-end.
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  const resp = await page.request.post(`${BASE}/api/data/auth/login`, {
    data: { email: 'student@teaching-eval.jp', password: 'password' },
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await resp.json();
  await page.goto(`${BASE}/login`);
  await page.evaluate(({ user, token }) => {
    localStorage.setItem('user_info', JSON.stringify(user));
    localStorage.setItem('auth_token', token);
  }, { user: body.user, token: body.token });

  await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Scope strictly to the picker Card (the one containing 対話セッション一覧)
  const card = page.locator('.MuiCard-root', { hasText: '対話セッション一覧' });
  const deadEnd = await page.getByText('日誌IDが指定されていません').count();
  const pickerHeader = await page.getByText('対話セッション一覧').count();
  const sessionButtons = await card.locator('.MuiListItemButton-root').count();
  const journalsBtn = await card.getByRole('button', { name: /日誌一覧/ }).count();

  console.log('=== /chat (no journalId) PICKER VERIFY ===');
  console.log('dead-end message present :', deadEnd, deadEnd === 0 ? 'OK' : 'FAIL');
  console.log('picker header present    :', pickerHeader, pickerHeader >= 1 ? 'OK' : 'FAIL');
  console.log('session list buttons     :', sessionButtons, sessionButtons >= 1 ? 'OK' : '(none)');
  console.log('journals fallback button :', journalsBtn, journalsBtn >= 1 ? 'OK' : 'FAIL');

  if (sessionButtons > 0) {
    await card.locator('.MuiListItemButton-root').first().click();
    await page.waitForTimeout(1500);
    const url = page.url();
    const inChat = /journalId=/.test(url);
    const chatHeader = await page.getByText('省察支援チャットBot').count();
    console.log('after click -> URL       :', url);
    console.log('navigated into chat      :', (inChat && chatHeader >= 1) ? 'OK' : 'FAIL');
  }

  await browser.close();
})();
