async function run() {
  const loginRes = await fetch('http://localhost:3000/api/data/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@teaching-eval.jp', password: 'password' })
  });
  const { token } = await loginRes.json();
  
  const headers = { 'Authorization': `Bearer ${token}` };
  
  console.log('Testing /api/analytics/pipeline...');
  const pRes = await fetch('http://localhost:3000/api/analytics/pipeline', { headers });
  console.log(await pRes.json());
  
  console.log('Testing /api/stats/ai-vs-human...');
  const aiRes = await fetch('http://localhost:3000/api/stats/ai-vs-human', { headers });
  console.log('Status:', aiRes.status, 'Response size:', (await aiRes.text()).length);
  
}
run();
