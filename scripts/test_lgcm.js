const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

const SECRET = 'default_local_secret_key_for_dev_only';
const token = jwt.sign({ id: 'user-002', role: 'univ_teacher', exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET);

async function run() {
  const res = await fetch('http://localhost:8788/api/stats/lgcm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
run();
