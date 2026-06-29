// 教育実習日誌の提出フローを厳密に検証する。
// 1) ログイン → 新規日誌記入 → コマに本文入力 → 日付選択
// 2) 「提出してAI評価へ」クリック → status:submitted で保存されるか
// 3) entry_date が選んだ日付になっているか
// 4) 成功スナックバーが出るか
// 5) AI評価パイプライン (auto_pipeline_triggered) が発火するか
// 6) 4xx/5xx ノイズ (特に chat-sessions 404) が出ないか
const { chromium } = require('playwright');
const BASE = 'http://localhost:3000';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();

  const netErrors = [];
  const apiResponses = [];
  page.on('response', (resp) => {
    const u = resp.url();
    const s = resp.status();
    if (u.includes('/api/data/journals') && (resp.request().method() === 'POST')) {
      apiResponses.push({ url: u, status: s, method: 'POST' });
    }
    if (s >= 400 && u.includes('/api/')) {
      netErrors.push(`${s} ${resp.request().method()} ${u.replace(BASE, '')}`);
    }
  });

  // --- login ---
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

  // --- new journal page ---
  await page.goto(`${BASE}/journal-workflow`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // entry date: pick a unique past date (avoid UNIQUE(student,date) collisions on re-runs)
  const dd = String(1 + Math.floor(Math.random() * 27)).padStart(2, '0');
  const mm = String(1 + Math.floor(Math.random() * 5)).padStart(2, '0');
  const CHOSEN_DATE = `2025-${mm}-${dd}`;
  const dateInput = page.locator('input[type="date"]').first();
  if (await dateInput.count()) {
    await dateInput.fill(CHOSEN_DATE);
  }

  // fill body text into first 本文 textarea (need >=30 chars total)
  const longText = '本日は算数の授業を担当した。児童の反応を見ながら机間指導を行い、つまずいている児童に個別に声かけをした。授業の導入で具体物を使ったことで関心を引き出せた。';
  // expand first HourBlock if needed, then type into 本文 field
  const bodyFields = page.locator('textarea');
  const cnt = await bodyFields.count();
  let typed = false;
  for (let i = 0; i < cnt; i++) {
    const ph = await bodyFields.nth(i).getAttribute('placeholder');
    const name = await bodyFields.nth(i).getAttribute('name');
    if ((ph && /本文|授業|内容|記録/.test(ph)) || (name && /body/.test(name))) {
      await bodyFields.nth(i).fill(longText);
      typed = true;
      break;
    }
  }
  if (!typed) {
    // fallback: first visible textarea
    await bodyFields.first().fill(longText);
  }
  await page.waitForTimeout(500);

  // --- click 提出してAI評価へ ---
  const submitBtn = page.getByRole('button', { name: /提出してAI評価/ });
  const hasSubmit = await submitBtn.count();
  console.log('=== JOURNAL SUBMIT FLOW VERIFY ===');
  console.log('submit button present    :', hasSubmit, hasSubmit >= 1 ? 'OK' : 'FAIL');
  let snackOK = 0;
  if (hasSubmit) {
    await submitBtn.first().click();
    // snackbar は autoHideDuration=3000ms。クリック直後に判定する。
    await page.waitForTimeout(1200);
    snackOK = await page.getByText(/提出しました|AI評価が完了/).count();
  }
  console.log('success snackbar         :', snackOK >= 1 ? 'OK' : 'FAIL');
  await page.waitForTimeout(4000); // allow pipeline + step transition

  // --- check POST response body ---
  let createdId = null;
  let pipelineTriggered = null;
  for (const r of apiResponses) {
    console.log(`POST ${r.url.replace(BASE, '')} -> ${r.status}`);
  }
  // fetch the created journal via API to verify status/entry_date
  // grab latest journal for this student
  const listResp = await page.request.get(`${BASE}/api/data/journals`, {
    headers: { Authorization: `Bearer ${body.token}` },
  });
  const list = await listResp.json();
  const journals = Array.isArray(list) ? list : (list.journals || list.data || []);
  // most recent by created_at / entry_date matching chosen date
  const match = journals
    .filter((j) => j.student_id === body.user.id)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
  if (match) {
    createdId = match.id;
    console.log('latest journal id        :', createdId);
    console.log('status                   :', match.status, match.status === 'submitted' ? 'OK' : 'FAIL');
    const dateOnly = (match.entry_date || '').slice(0, 10);
    console.log('entry_date               :', match.entry_date, dateOnly === CHOSEN_DATE ? 'OK (chosen date respected)' : `FAIL (expected ${CHOSEN_DATE})`);
  } else {
    console.log('latest journal           : NOT FOUND');
  }

  // --- check AI evaluation exists ---
  if (createdId) {
    await page.waitForTimeout(1000);
    const evalResp = await page.request.get(`${BASE}/api/data/evaluations?journal_id=${createdId}`, {
      headers: { Authorization: `Bearer ${body.token}` },
    });
    let evals = [];
    try {
      const ej = await evalResp.json();
      evals = Array.isArray(ej) ? ej : (ej.evaluations || ej.data || []);
    } catch (e) { /* ignore */ }
    const aiEval = evals.filter((e) => e.eval_type === 'ai');
    console.log('AI evaluation count      :', aiEval.length, aiEval.length >= 1 ? 'OK (pipeline triggered)' : 'FAIL (no AI eval)');
  }

  // --- 4xx/5xx noise ---
  console.log('4xx/5xx /api responses   :', netErrors.length ? netErrors : 'NONE (clean)');

  await browser.close();
})();
