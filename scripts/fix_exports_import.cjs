const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/api/routes/exports.ts');
let content = fs.readFileSync(filePath, 'utf-8');

if (!content.includes('import { getScopeContext, buildScopeFilter }')) {
  content = content.replace('import { applyAnonymization } from "../services/anonymization";', 
    'import { applyAnonymization } from "../services/anonymization";\nimport { getScopeContext, buildScopeFilter } from "../middleware/scope";');
  fs.writeFileSync(filePath, content);
  console.log("Fixed exports.ts imports");
}
