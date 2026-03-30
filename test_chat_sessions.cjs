const baseUrl = 'https://fix-admin-bugs.teaching-practice-eval.pages.dev/api';

async function test() {
  const loginRes = await fetch(`${baseUrl}/data/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log("Logged in:", loginData.user.id);

  const res = await fetch(`${baseUrl}/data/chat-sessions?student_id=${loginData.user.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log("Chat sessions response status:", res.status);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
test().catch(console.error);
