async function run() {
  try {
    const resLogin = await fetch('http://localhost:3000/api/data/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@teaching-eval.jp', password: 'password' })
    });
    const { token } = await resLogin.json();

    const resCreate = await fetch('http://localhost:3000/api/external-jobs', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_type: 'SEM_CFA', dataset_type: 'evaluations_wide' })
    });
    const text = await resCreate.text();
    console.log("POST /api/external-jobs response status:", resCreate.status);
    console.log("POST /api/external-jobs response body:", text);

  } catch (err) {
    console.error(err);
  }
}
run();
