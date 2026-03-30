const { execSync } = require('child_process');

async function test() {
  const loginRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@teaching-eval.jp", password: "password" })
  }).then(r => r.json());
  
  if (!loginRes.token) {
    console.error("Login failed", loginRes);
    return;
  }
  
  const token = loginRes.token;
  console.log("Logged in as student.");
  
  const journalsRes = await fetch("https://fix-admin-bugs.teaching-practice-eval.pages.dev/api/data/journals", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  
  if (!journalsRes.ok) {
    console.error("Journals API failed", journalsRes.status, await journalsRes.text());
    return;
  }
  
  const data = await journalsRes.json();
  const journals = data.journals || data; // depending on the structure
  console.log(`Found ${Array.isArray(journals) ? journals.length : 'unknown'} journals.`);
  
  if (Array.isArray(journals) && journals.length > 0) {
    console.log("First journal title:", journals[0].title);
    console.log("First journal status:", journals[0].status);
  }
}

test();
