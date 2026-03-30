const fs = require('fs');
const file = 'src/index.tsx';
let code = fs.readFileSync(file, 'utf8');

const importTarget = 'import dataRouter from "./api/routes/data";';
const importReplace = `import dataRouter from "./api/routes/data";\nimport scatRouter from "./api/routes/scat";`;

const routeTarget = 'app.route("/api/data",   dataRouter);';
const routeReplace = `app.route("/api/data",   dataRouter);\napp.route("/api/data/scat", scatRouter);`;

if(code.includes(importTarget)) code = code.replace(importTarget, importReplace);
if(code.includes(routeTarget)) code = code.replace(routeTarget, routeReplace);

fs.writeFileSync(file, code, 'utf8');
console.log('Patched index.tsx with scatRouter');
