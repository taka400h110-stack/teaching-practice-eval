async function verify() {
  const loginRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@teaching-eval.jp", password: "password" })
  }).then(r => r.json());
  
  const token = loginRes.token;
  const res = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/journals/f6e11172-8ce8-43e1-9273-be9ab74388b9", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  const data = await res.json();
  console.log("Journal content object:");
  console.log(JSON.parse(data.journal.content));
}
verify();
