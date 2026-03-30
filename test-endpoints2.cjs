const https = require('https');

const BASE_URL = 'https://fix-admin-bugs.teaching-practice-eval.pages.dev';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {}
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing with Admin ===");
  // 1. Login as admin
  const loginRes = await request('POST', '/api/data/auth/login', {
    email: 'admin@example.com',
    password: 'password'
  });
  console.log(`Login Status: ${loginRes.status}`);
  const token = loginRes.data.token;

  if (!token) {
    console.error("Failed to get token", loginRes.data);
    return;
  }

  // 2. Test cleanup-failure
  const cleanupRes = await request('GET', '/api/admin/alerts/cleanup-failure', null, token);
  console.log(`GET /api/admin/alerts/cleanup-failure - Status: ${cleanupRes.status}`);
  if (cleanupRes.status !== 200) console.log(cleanupRes.data);

  // 3. Test journals
  const journalsRes = await request('GET', '/api/data/journals', null, token);
  console.log(`GET /api/data/journals - Status: ${journalsRes.status}`);
  if (journalsRes.status !== 200) console.log(journalsRes.data);

  // 4. Test evaluations
  const evalsRes = await request('GET', '/api/data/evaluations', null, token);
  console.log(`GET /api/data/evaluations - Status: ${evalsRes.status}`);
  if (evalsRes.status !== 200) console.log(evalsRes.data);

}

runTests().catch(console.error);
