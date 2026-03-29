const fs = require('fs');

const path = '/home/user/webapp/src/index.tsx';
let code = fs.readFileSync(path, 'utf8');

// Add import
if (!code.includes('auditWriteMiddleware')) {
  code = code.replace(
    'import { auditReadMiddleware } from "./api/middleware/audit";',
    'import { auditReadMiddleware, auditWriteMiddleware } from "./api/middleware/audit";'
  );
}

// Add middleware usage
if (!code.includes('app.use("/api/*", auditWriteMiddleware)')) {
  code = code.replace(
    'app.use("/api/*", auditReadMiddleware);',
    'app.use("/api/*", auditReadMiddleware);\napp.use("/api/*", auditWriteMiddleware);'
  );
}

fs.writeFileSync(path, code);
console.log('Applied auditWriteMiddleware to index.tsx');
