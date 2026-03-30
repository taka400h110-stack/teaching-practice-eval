const baseUrl = 'https://fix-admin-bugs.teaching-practice-eval.pages.dev/api';

async function verify() {
  const loginRes = await fetch(`${baseUrl}/data/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  const { token } = await loginRes.json();
  
  const getRes = await fetch(`${baseUrl}/data/evaluations/f6e11172-8ce8-43e1-9273-be9ab74388b9`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`GET status: ${getRes.status}`);
  if(getRes.ok) {
     const data = await getRes.json();
     console.log(`Eval items count: ${data.evaluation_items.length}`);
  }
}
verify().catch(console.error);
