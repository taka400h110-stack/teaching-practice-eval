async function test() {
  const loginRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@teaching-eval.jp", password: "password" })
  }).then(r => r.json());
  
  const token = loginRes.token;
  console.log("Logged in:", !!token);

  // 1. GET /journals
  const journalsRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/journals", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  console.log("GET /journals:", journalsRes.status);
  const data = await journalsRes.json();
  const journals = data.journals || [];
  console.log("Found journals:", journals.length);
  
  if (journals.length > 0) {
    const journalId = journals[0].id;
    console.log("First journal:", journals[0].title, journalId);
    
    // 2. GET /journals/:id
    const journalRes = await fetch(`https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/journals/${journalId}`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    console.log(`GET /journals/${journalId}:`, journalRes.status);
  }
}
test();
