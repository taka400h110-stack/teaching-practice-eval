const fs = require('fs');
const path = require('path');

const fixHook = (hookPath) => {
  let content = fs.readFileSync(hookPath, 'utf8');
  content = content.replace("import { api } from '../api/client';", "import { apiFetch } from '../api/client';");
  
  // Replace api.get with apiFetch
  content = content.replace(/api\.get\((.*?)\)/g, 'apiFetch($1)');
  
  // Replace api.post with apiFetch
  content = content.replace(/api\.post\((.*?), (.*?)\)/g, "apiFetch($1, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify($2) })");
  
  // Add parsing response since apiFetch returns fetch response
  content = content.replace(/const res = await apiFetch(.*);\n\s*return res.data/g, "const res = await apiFetch$1;\n      const data = await res.json();\n      return data");
  
  fs.writeFileSync(hookPath, content);
};

['useCleanupAlertComments.ts', 'useCleanupAlertAssignee.ts', 'useCleanupAlertEscalations.ts'].forEach(f => {
  fixHook(path.join(__dirname, '../src/hooks', f));
});
