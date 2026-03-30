async function test() {
  const loginRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@teaching-eval.jp", password: "password" })
  }).then(r => r.json());
  
  if (!loginRes.token) {
    console.error("Login failed", loginRes);
    return;
  }
  
  const token = loginRes.token;
  console.log("Logged in as admin.");
  
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
  const text = await res.text();
  console.log("Response:", text);
}

test();
