const fs = require('fs');

let clientTs = fs.readFileSync('/home/user/webapp/src/api/client.ts', 'utf8');

clientTs = clientTs.replace(
  'login: async (email: string, _password: string) => {',
  'login: async (email: string, password: string) => {'
);
clientTs = clientTs.replace(
  'body: JSON.stringify({ email })',
  'body: JSON.stringify({ email, password })'
);

fs.writeFileSync('/home/user/webapp/src/api/client.ts', clientTs);
console.log('Updated client.ts login method');
