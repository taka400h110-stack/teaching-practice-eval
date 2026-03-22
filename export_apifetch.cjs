const fs = require('fs');
let clientTs = fs.readFileSync('/home/user/webapp/src/api/client.ts', 'utf8');

clientTs = clientTs.replace(
  'async function apiFetch',
  'export async function apiFetch'
);
fs.writeFileSync('/home/user/webapp/src/api/client.ts', clientTs);
console.log('Exported apiFetch from client.ts');

