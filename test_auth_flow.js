async function run() {
  console.log('Testing login...');
  const loginRes = await fetch('http://localhost:3000/api/data/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@teaching-eval.jp', password: 'password' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  console.log('Login success:', loginData.user.name, 'Token:', loginData.token.substring(0, 15) + '...');
  
  console.log('Testing authenticated route (/api/data/journals)...');
  const journalsRes = await fetch('http://localhost:3000/api/data/journals', {
    headers: { 'Authorization': `Bearer ${loginData.token}` }
  });
  console.log('Journals status:', journalsRes.status);
  
  console.log('Testing unauthenticated route (/api/data/journals)...');
  const unauthRes = await fetch('http://localhost:3000/api/data/journals');
  console.log('Unauth status:', unauthRes.status);
}
run();
