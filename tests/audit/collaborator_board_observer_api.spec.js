const BASE = 'https://teaching-practice-eval.pages.dev';
async function login(email, pw) {
  const r = await fetch(`${BASE}/api/data/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, password:pw}) });
  return await r.json();
}
async function req(method, token, path, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: { 'Authorization': `Bearer ${token}`, ...(body ? {'Content-Type':'application/json'} : {}) }, body: body ? JSON.stringify(body) : undefined });
  const txt = await r.text();
  let data; try { data = JSON.parse(txt); } catch { data = txt.slice(0,80); }
  return { status: r.status, isHtml: typeof data==='string' && data.includes('<!DOCTYPE'), data };
}

(async () => {
  for (const email of ['collaborator@teaching-eval.jp', 'observer@teaching-eval.jp']) {
    const auth = await login(email, 'password');
    console.log(`\n=== ${auth.user?.role} (${email}) ===`);
    console.log(`User: ${JSON.stringify(auth.user)}`);
    if (!auth.token) { console.log('  ❌ login failed:', auth); continue; }
    const tok = auth.token;

    const tests = [
      // 閲覧系 (両ロールとも 200 期待)
      ['GET',  '/api/data/users'],
      ['GET',  '/api/data/journals'],
      ['GET',  '/api/data/evaluations'],
      ['GET',  '/api/data/cohorts'],
      ['GET',  '/api/data/exports/requests'],
      ['GET',  '/api/admin/operational-readiness'],
      ['GET',  '/api/admin/metrics/cleanup?range=7d'],
      ['GET',  '/api/analytics/pipeline'],
      // 統計エンジン (両ロール 200 期待)
      ['POST', '/api/stats/icc', { ratings: [[3,4,5,4,3],[3,4,5,3,3],[3,4,4,4,3]] }],
      ['POST', '/api/stats/lgcm', { weekly_scores: [[1,2,3,4,5],[2,3,4,5,6],[1,2,3,4,5]] }],
      // 書き込み: エクスポート要求 (両ロール 200 期待)
      ['POST', '/api/data/exports/requests', {
        request_type: 'export', dataset_type: 'journals', scope_level: 'cohort',
        cohort_id: 'demo', requested_anonymization_level: 'pseudonymized',
        purpose: '監査テスト', justification: `${email} 用テスト`
      }],
      // 書き込み: human-evals (board_observer が POST 可能か?)
      ['POST', '/api/data/human-evals', {
        journal_id: '2a47f8a9-8fca-4e72-8732-421bb0e3985d',
        evaluator_id: auth.user?.id || 'unknown',
        scores: { factor1: 4, factor2: 4, factor3: 3, factor4: 4 },
        comment: '監査テスト',
        total_score: 15
      }],
    ];

    for (const [m, p, body] of tests) {
      const r = await req(m, tok, p, body);
      const flag = (r.status === 200 || r.status === 201) ? '✅' : (r.status === 403 ? '🛑403' : `❌${r.status}`);
      const summary = r.isHtml ? '<SPA>' : (typeof r.data === 'object' ? JSON.stringify(r.data).slice(0,140) : String(r.data).slice(0,140));
      console.log(`  ${flag} ${m.padEnd(5)} ${p.padEnd(45)} → ${summary}`);
    }
  }
})();
