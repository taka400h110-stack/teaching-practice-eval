const BASE = "https://teaching-practice-eval.pages.dev";
async function login(email) {
  const r = await fetch(`${BASE}/api/data/auth/login`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({email, password:"password"})
  });
  return await r.json();
}
(async () => {
  // 学生・evaluator で admin専用APIをチェック
  for (const acct of ["student@teaching-eval.jp", "evaluator@teaching-eval.jp"]) {
    const t = (await login(acct)).token;
    const h = { Authorization: `Bearer ${t}` };
    console.log(`\n=== ${acct} ===`);
    for (const p of [
      "/api/admin/operational-readiness",
      "/api/admin/incidents/cleanup?fingerprint=x",
      "/api/admin/metrics/cleanup?range=7d",
      "/api/admin/alerts/history",
      "/api/admin/analytics/delivery?range=7d",
      "/api/data/users",
    ]) {
      const r = await fetch(`${BASE}${p}`, { headers: h });
      console.log(`  ${r.status} ${r.status === 403 ? "✅" : "⚠️"} ${p}`);
    }
  }
  
  // admin/researcher で 200 期待
  for (const acct of ["admin@teaching-eval.jp", "researcher@teaching-eval.jp"]) {
    const t = (await login(acct)).token;
    const h = { Authorization: `Bearer ${t}` };
    console.log(`\n=== ${acct} (200期待) ===`);
    for (const p of [
      "/api/admin/operational-readiness",
      "/api/admin/incidents/cleanup?fingerprint=x",
    ]) {
      const r = await fetch(`${BASE}${p}`, { headers: h });
      console.log(`  ${r.status} ${r.status === 200 ? "✅" : "⚠️"} ${p}`);
    }
  }
})();
