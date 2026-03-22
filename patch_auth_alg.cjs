const fs = require('fs');
let indexTsx = fs.readFileSync('/home/user/webapp/src/index.tsx', 'utf8');

indexTsx = indexTsx.replace(
  'const payload = await verify(token, secret);',
  'const payload = await verify(token, secret, "HS256");'
);

fs.writeFileSync('/home/user/webapp/src/index.tsx', indexTsx);
console.log('Added HS256 to verify');
