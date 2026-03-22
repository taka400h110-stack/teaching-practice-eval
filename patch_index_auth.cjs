const fs = require('fs');

let indexTsx = fs.readFileSync('/home/user/webapp/src/index.tsx', 'utf8');

indexTsx = indexTsx.replace(
  'app.use("/api/data/*", authMiddleware);',
  'app.use("/api/*", authMiddleware);'
);

fs.writeFileSync('/home/user/webapp/src/index.tsx', indexTsx);
console.log('Updated index.tsx to apply authMiddleware to all /api/* routes');

