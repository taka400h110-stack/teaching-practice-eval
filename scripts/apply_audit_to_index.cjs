const fs = require('fs');

const path = '/home/user/webapp/src/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add import
if (!code.includes('auditReadMiddleware')) {
  code = code.replace(
    'import { requireAuth } from "./api/middleware/auth";',
    'import { requireAuth } from "./api/middleware/auth";\nimport { auditReadMiddleware } from "./api/middleware/audit";'
  );
}

// Add middleware usage after auth
if (!code.includes('app.use("/api/*", auditReadMiddleware)')) {
  code = code.replace(
    'app.use("/api/*", requireAuth);',
    'app.use("/api/*", requireAuth);\napp.use("/api/*", auditReadMiddleware);'
  );
}

fs.writeFileSync(path, code);
console.log('Applied auditReadMiddleware to index.tsx');
