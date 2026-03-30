const baseUrl = 'https://fix-admin-bugs.teaching-practice-eval.pages.dev/api';
async function test() {
  const loginRes = await fetch(`${baseUrl}/data/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  const { token } = await loginRes.json();
  const getRes = await fetch(`${baseUrl}/data/journals/7a3f4126-f4b3-4060-8e43-c4c7c08f7482`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await getRes.json();
  console.log("Journal status:", data.journal ? data.journal.status : data.status);
}
test().catch(console.error);
