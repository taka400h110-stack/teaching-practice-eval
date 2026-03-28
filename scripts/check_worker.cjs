const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 8788,
  path: '/api/data/exports/requests',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + require('jsonwebtoken').sign({id: 'researcher-1', role: 'researcher'}, 'default_local_secret_key_for_dev_only')
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log("RES:", res.statusCode, body));
});

req.write(JSON.stringify({
  dataset_type: 'journals',
  scope_level: 'cohort',
  requested_anonymization_level: 'pseudonymized',
  purpose: 'Research analysis'
}));
req.end();
