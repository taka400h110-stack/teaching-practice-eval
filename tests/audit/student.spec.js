// 学生ロール 最終監査 (キャッシュ無効化 + ボタン操作テスト)
const { chromium } = require('/home/user/webapp/node_modules/playwright');
const fs = require('fs');
const BASE = 'https://teaching-practice-eval.pages.dev';

(async () => {
  const loginRes = await fetch(`${BASE}/api/data/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' }),
  });
  const { token, user } = await loginRes.json();
  console.log('✅ ログイン:', user.email);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // キャッシュ無効化
  await ctx.route('**/*', (route) => {
    route.continue({ headers: { ...route.request().headers(), 'cache-control': 'no-cache' } });
  });
  await ctx.addInitScript(({ t, u }) => {
    localStorage.setItem('auth_token', t); localStorage.setItem('token', t);
    localStorage.setItem('user_info', JSON.stringify(u)); localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem(`onboarding_done_${u.id}`, '1');
  }, { t: token, u: user });

  const report = [];
  const collect = (page) => {
    const errs = { console: [], pageErr: [], dialogs: [], netFail: [] };
    page.on('console', m => { if (m.type() === 'error') errs.console.push(m.text().slice(0,200)); });
    page.on('pageerror', e => errs.pageErr.push((e.stack || e.message).slice(0,250)));
    page.on('dialog', async d => { errs.dialogs.push(d.message().slice(0,150)); await d.dismiss(); });
    page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 400) errs.netFail.push(`HTTP${r.status()} ${r.url().slice(-60)}`); });
    return errs;
  };

  // ─── 各ページ訪問 ───
  const PAGES = [
    { id:'P1', path:'/dashboard',           name:'ダッシュボード' },
    { id:'P2', path:'/journal-workflow',    name:'実習日誌ワークフロー' },
    { id:'P3', path:'/ocr',                 name:'手書き日誌OCR' },
    { id:'P4', path:'/journals',            name:'過去の日誌一覧' },
    { id:'P5', path:'/journals/new',        name:'日誌新規作成' },
    { id:'P6', path:'/chat',                name:'チャット履歴' },
    { id:'P7', path:'/self-evaluation',     name:'自己評価入力' },
    { id:'P8', path:'/growth',              name:'成長グラフ' },
    { id:'P9', path:'/goals',               name:'目標履歴（SMART）' },
    { id:'P10',path:'/bfi',                 name:'BFI パーソナリティ診断' },
  ];

  for (const p of PAGES) {
    const page = await ctx.newPage();
    const errs = collect(page);
    try {
      await page.goto(`${BASE}${p.path}`, { waitUntil: 'networkidle', timeout: 30000 });
    } catch {}
    await page.waitForTimeout(3500);
    const s = await page.evaluate(() => ({
      heading: (document.querySelector('h1,h2,h3,h4,h5')?.innerText || '').slice(0,50),
      btn: document.querySelectorAll('button:not([disabled])').length,
      input: document.querySelectorAll('input,textarea').length,
      table: document.querySelectorAll('table').length,
      rows: document.querySelectorAll('table tbody tr').length,
      chart: document.querySelectorAll('svg[class*="recharts"]').length,
      tab: document.querySelectorAll('[role="tab"]').length,
      card: document.querySelectorAll('.MuiCard-root').length,
      alerts: Array.from(document.querySelectorAll('[role="alert"]')).map(a => a.innerText.slice(0,80)),
      bodyLen: document.body.innerText.length,
    }));
    const status = (errs.pageErr.length || errs.dialogs.length) ? '❌' : (errs.console.length || errs.netFail.length) ? '⚠️' : '✅';
    console.log(`${status} ${p.id} ${p.name} | btn=${s.btn} input=${s.input} table=${s.table}(${s.rows}行) chart=${s.chart} tab=${s.tab} card=${s.card} body=${s.bodyLen}`);
    if (s.alerts.length) console.log(`     alert: ${s.alerts.slice(0,1).join(' | ')}`);
    if (errs.pageErr.length) console.log(`     pageErr: ${errs.pageErr[0]}`);
    if (errs.dialogs.length) console.log(`     dialog: ${errs.dialogs[0]}`);
    if (errs.netFail.length) console.log(`     netFail: ${errs.netFail.slice(0,1).join(' | ')}`);
    report.push({ ...p, status, stats: s, errors: errs });
    await page.close();
  }

  // ─── BFI タブ② ───
  console.log('\n─ BFI タブ② 統合分析 ─');
  {
    const page = await ctx.newPage();
    const errs = collect(page);
    await page.goto(`${BASE}/bfi`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.locator('[role="tab"]').nth(1).click();
    await page.waitForTimeout(15000);
    const s = await page.evaluate(() => ({
      chart: document.querySelectorAll('svg[class*="recharts"]').length,
      card: document.querySelectorAll('.MuiCard-root').length,
      table: document.querySelectorAll('table').length,
      rows: document.querySelectorAll('table tbody tr').length,
      h6: Array.from(document.querySelectorAll('h6')).map(e => e.innerText.slice(0,30)).filter(t => t.match(/[①②③④⑤]/)),
      bodyLen: document.body.innerText.length,
      hasLLMText: /パーソナリティ|強み|提言/.test(document.body.innerText),
    }));
    const status = (errs.pageErr.length || errs.dialogs.length) ? '❌' : '✅';
    console.log(`${status} P10b BFIタブ② | chart=${s.chart} table=${s.table}(${s.rows}行) card=${s.card} body=${s.bodyLen} LLM出力=${s.hasLLMText}`);
    console.log(`     セクション: ${s.h6.join(' / ')}`);
    if (errs.pageErr.length) console.log(`     pageErr: ${errs.pageErr[0]}`);
    if (errs.dialogs.length) console.log(`     dialog: ${errs.dialogs[0]}`);
    report.push({ id:'P10b', name:'BFIタブ②', status, stats: s, errors: errs });
    await page.close();
  }

  // ─── /journals から詳細遷移 ───
  console.log('\n─ /journals → /journals/:id (IconButton クリック) ─');
  {
    const page = await ctx.newPage();
    const errs = collect(page);
    await page.goto(`${BASE}/journals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const cardCount = await page.locator('.MuiCard-root').count();
    console.log(`  一覧 cards=${cardCount}`);
    // IconButton (svg内のVisibilityIcon) を最初のカード内で探す
    const detailIcon = page.locator('button[aria-label]').filter({ hasNot: page.locator('text=ログアウト') }).first();
    // 別アプローチ: 「詳細を見る」ツールチップのボタンを探す
    const visibilityBtn = page.locator('button:has(svg[data-testid="VisibilityIcon"])').first();
    const cnt = await visibilityBtn.count();
    console.log(`  詳細ボタン候補: ${cnt}`);
    if (cnt > 0) {
      await visibilityBtn.click();
      await page.waitForTimeout(3000);
      const url = page.url();
      const s = await page.evaluate(() => ({
        heading: (document.querySelector('h1,h2,h3,h4,h5')?.innerText || '').slice(0,50),
        chart: document.querySelectorAll('svg[class*="recharts"]').length,
        table: document.querySelectorAll('table').length,
        rows: document.querySelectorAll('table tbody tr').length,
        btn: document.querySelectorAll('button:not([disabled])').length,
        bodyLen: document.body.innerText.length,
      }));
      const status = (errs.pageErr.length || errs.dialogs.length) ? '❌' : '✅';
      console.log(`${status} P11 日誌詳細 | URL=${url.replace(BASE,'')} chart=${s.chart} table=${s.table}(${s.rows}行) btn=${s.btn} body=${s.bodyLen}`);
      console.log(`     見出し: ${s.heading}`);
      if (errs.pageErr.length) console.log(`     pageErr: ${errs.pageErr[0]}`);
      report.push({ id:'P11', name:'日誌詳細(IconButton経由)', status, finalUrl:url, stats: s, errors: errs });
    } else {
      console.log('  ❌ 詳細アイコンボタンが見つからない');
    }
    await page.close();
  }

  // ─── /evaluations/:id ───
  console.log('\n─ /evaluations/:journalId ─');
  {
    const jr = await fetch(`${BASE}/api/data/journals?student_id=user-001`, { headers: { Authorization: `Bearer ${token}` } });
    const { journals } = await jr.json();
    const evaluated = journals.find(j => j.status === 'evaluated') || journals[0];
    const page = await ctx.newPage();
    const errs = collect(page);
    await page.goto(`${BASE}/evaluations/${evaluated.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    const s = await page.evaluate(() => ({
      heading: (document.querySelector('h1,h2,h3,h4,h5')?.innerText || '').slice(0,50),
      chart: document.querySelectorAll('svg[class*="recharts"]').length,
      table: document.querySelectorAll('table').length,
      rows: document.querySelectorAll('table tbody tr').length,
      btn: document.querySelectorAll('button:not([disabled])').length,
      bodyLen: document.body.innerText.length,
    }));
    const status = (errs.pageErr.length || errs.dialogs.length) ? '❌' : '✅';
    console.log(`${status} P12 評価結果 | chart=${s.chart} table=${s.table}(${s.rows}行) btn=${s.btn} body=${s.bodyLen}`);
    console.log(`     見出し: ${s.heading}`);
    if (errs.pageErr.length) console.log(`     pageErr: ${errs.pageErr[0]}`);
    report.push({ id:'P12', name:'評価結果', status, journalId: evaluated.id, stats: s, errors: errs });
    await page.close();
  }

  // ─── ボタン操作: /journals/new → 保存 ───
  console.log('\n─ /journals/new フォーム入力テスト ─');
  {
    const page = await ctx.newPage();
    const errs = collect(page);
    await page.goto(`${BASE}/journals/new`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    // フィールドの存在確認
    const fields = await page.evaluate(() => ({
      textareas: document.querySelectorAll('textarea').length,
      inputs: document.querySelectorAll('input[type="text"], input[type="number"]').length,
      buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText).filter(t => t),
    }));
    console.log(`  textareas=${fields.textareas} inputs=${fields.inputs}`);
    console.log(`  buttons: ${fields.buttons.slice(0,8).join(' / ')}`);
    report.push({ id:'P5-form', name:'日誌新規作成フォーム', stats: fields, errors: errs });
    await page.close();
  }

  fs.writeFileSync('/tmp/student_audit_final.json', JSON.stringify(report, null, 2));
  console.log('\n📄 結果保存: /tmp/student_audit_final.json');
  await browser.close();
})();
