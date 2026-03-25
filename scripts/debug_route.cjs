const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
const patched = code.replace(
  /const hasRole = userRoles\.some\(\(r: string\) => allowedRoles\.includes\(r\)\);/,
  `const hasRole = userRoles.some((r: string) => allowedRoles.includes(r));
    console.log("PrivateRoute Debug:", { allowedRoles, userRoles, hasRole });`
);
fs.writeFileSync('src/App.tsx', patched);
