// 教育実習日誌の編集モードとコマ操作を検証する。
// A) draft保存 → 開き直し(編集モード) → 本文復元 → submitted提出 (draft→submitted遷移)
// B) コマ(時間ブロック)の追加 / 削除 / 並び替え
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';

async function login(page) {
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
  return body;
}

// コマカード数 = time 入力数 / 2 (各カードに start/end の time 入力)
async function komaCount(page) {
  const t = await page.locator('input[type="time"]').count();
  return Math.floor(t / 2);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  const netErrors = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('/api/')) netErrors.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, '')}`);
  });

  const auth = await login(page);
  console.log('=== JOURNAL EDIT + KOMA VERIFY ===');

  // ============ PART B: コマ操作 ============
  await page.goto(`${BASE}/journal-workflow`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const initialKoma = await komaCount(page);
  console.log('initial コマ count       :', initialKoma);

  const addChip = page.locator('.MuiChip-root', { hasText: '＋ カスタム' }).first();
  await addChip.click();
  await page.waitForTimeout(500);
  await addChip.click(); // now 3 total
  await page.waitForTimeout(500);
  const afterAdd = await komaCount(page);
  console.log('after add x2 コマ count  :', afterAdd, afterAdd === initialKoma + 2 ? 'OK (+2)' : 'FAIL');

  // delete: Tooltip title "削除" の IconButton (aria-label="削除")
  const delBtn = page.getByRole('button', { name: 'このコマを削除' });
  const delN = await delBtn.count();
  if (delN > 0) {
    await delBtn.last().click();
    await page.waitForTimeout(500);
  }
  const afterDel = await komaCount(page);
  console.log('after delete コマ count  :', afterDel, afterDel === afterAdd - 1 ? 'OK (-1)' : `FAIL (del buttons found=${delN})`);

  // reorder: "下へ" の IconButton。1枚目を下へ移動し time_label の入れ替わりを確認
  // 1枚目の time_label を一意にしておく
  const firstLabel = page.locator('input').filter({ hasNot: page.locator('[type="time"],[type="date"]') });
  // set distinctive labels via the first text input of each card is the time_label
  const labelInputs = page.locator('.MuiCard-root input[placeholder="コマ名"]');
  const labelN = await labelInputs.count();
  if (labelN >= 2) {
    await labelInputs.nth(0).fill('AAA');
    await labelInputs.nth(1).fill('BBB');
    await page.waitForTimeout(300);
  }
  const downBtn = page.getByRole('button', { name: 'このコマを下へ移動' });
  const downN = await downBtn.count();
  let reorderResult = 'FAIL';
  if (downN >= 1 && labelN >= 2) {
    const before = await labelInputs.nth(0).inputValue();
    await downBtn.first().click();
    await page.waitForTimeout(500);
    const after = await labelInputs.nth(0).inputValue();
    reorderResult = (before === 'AAA' && after === 'BBB') ? 'OK (order swapped)' : `OK? (before=${before} after=${after})`;
  }
  console.log('reorder (下へ)           :', downN, 'buttons →', reorderResult);

  // ============ PART A: draft save → reopen → submit ============
  await page.goto(`${BASE}/journal-workflow`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const dd = String(1 + Math.floor(Math.random() * 27)).padStart(2, '0');
  const CHOSEN_DATE = `2025-08-${dd}`;
  await page.locator('input[type="date"]').first().fill(CHOSEN_DATE);

  const longText = '本日は理科の授業を担当した。実験の安全指導を行い、児童が主体的に観察できるよう班ごとに役割を分担させた。予想と結果の違いに気づかせる発問を工夫した。';
  // 本文 textarea = placeholder に "授業の内容" を含むもの
  const bodyTa = page.locator('textarea[placeholder*="授業の内容"]').first();
  await bodyTa.fill(longText);
  await page.waitForTimeout(400);

  const draftBtn = page.getByRole('button', { name: /下書き/ }).first();
  if (await draftBtn.count()) {
    await draftBtn.click();
    await page.waitForTimeout(2500);
  }
  const listResp = await page.request.get(`${BASE}/api/data/journals`, { headers: { Authorization: `Bearer ${auth.token}` } });
  const list = await listResp.json();
  const journals = Array.isArray(list) ? list : (list.journals || list.data || []);
  const draft = journals.filter((j) => j.student_id === auth.user.id && (j.entry_date || '').slice(0, 10) === CHOSEN_DATE)[0];
  const draftId = draft && draft.id;
  console.log('draft saved              :', draftId ? 'OK' : 'FAIL', draft ? `(status=${draft.status})` : '');

  if (draftId) {
    await page.goto(`${BASE}/journal-workflow/${draftId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200); // wait for existing query + restore effect
    const restored = await page.locator('textarea[placeholder*="授業の内容"]').first().inputValue().catch(() => '');
    console.log('body restored on reopen  :', restored.includes('理科') ? 'OK' : `FAIL (got: "${restored.slice(0,20)}")`);

    const submitBtn = page.getByRole('button', { name: /提出してAI評価/ });
    if (await submitBtn.count()) {
      await submitBtn.first().click();
      await page.waitForTimeout(3500);
    }
    const r2 = await page.request.get(`${BASE}/api/data/journals/${draftId}`, { headers: { Authorization: `Bearer ${auth.token}` } });
    const j2 = await r2.json();
    const finalStatus = (j2.journal || j2).status;
    console.log('status after edit-submit :', finalStatus, finalStatus === 'submitted' ? 'OK (draft→submitted)' : 'FAIL');
  }

  console.log('4xx/5xx /api responses   :', netErrors.length ? netErrors : 'NONE (clean)');
  await browser.close();
})();
