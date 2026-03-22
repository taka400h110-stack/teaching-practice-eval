async function run() {
  try {
    const resLogin = await fetch('http://localhost:3000/api/data/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@teaching-eval.jp', password: 'password' })
    });
    const { token } = await resLogin.json();

    const resJobs = await fetch('http://localhost:3000/api/external-jobs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log("GET /api/external-jobs status:", resJobs.status);

    const resCreate = await fetch('http://localhost:3000/api/external-jobs', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_type: 'SEM_CFA', dataset_type: 'evaluations_wide' })
    });
    const created = await resCreate.json();
    console.log("POST /api/external-jobs response:", created);

    if (created.job_id) {
      const resComplete = await fetch(`http://localhost:3000/api/external-jobs/${created.job_id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' })
      });
      const completed = await resComplete.json();
      console.log("POST complete job response:", completed);
    }

  } catch (err) {
    console.error(err);
  }
}
run();
