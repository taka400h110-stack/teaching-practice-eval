async function test() {
  const loginRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@teaching-eval.jp", password: "password" })
  }).then(r => r.json());
  
  const token = loginRes.token;
  const res = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/external-jobs", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      job_type: "scat-batch",
      dataset_type: "scat_analysis",
      parameters: { journal_ids: ["j1", "j2"] }
    })
  });
  
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}
test();
