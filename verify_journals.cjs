async function verify() {
  const loginRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@teaching-eval.jp", password: "password" })
  }).then(r => r.json());
  
  const token = loginRes.token;
  const res = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/journals", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  const data = await res.json();
  console.log(`Found ${data.journals.length} journals`);
  for (const j of data.journals) {
    console.log(`- ${j.title} (ID: ${j.id}, Status: ${j.status})`);
  }
}
verify();
