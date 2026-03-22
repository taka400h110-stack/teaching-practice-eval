const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('/home/user/webapp/src/pages/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('await fetch(') || content.includes('fetch(')) {
    // Add import if not present
    if (!content.includes('import { apiFetch } from') && !content.includes('import { apiFetch,') && !content.includes('import {apiFetch} from')) {
      // Find a good place to insert import, e.g., after the last import
      const importMatches = [...content.matchAll(/^import .*$/gm)];
      const lastImportIndex = importMatches.length > 0 ? 
        importMatches[importMatches.length - 1].index + importMatches[importMatches.length - 1][0].length : 0;
      
      // relative path to apiFetch
      const relativePath = path.relative(path.dirname(file), '/home/user/webapp/src/api/client');
      let importPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
      if (importPath.endsWith('.ts')) importPath = importPath.slice(0, -3);
      
      content = content.slice(0, lastImportIndex) + `\nimport { apiFetch } from "${importPath}";` + content.slice(lastImportIndex);
    }
    
    // Replace fetch( with apiFetch(
    content = content.replace(/await fetch\(/g, 'await apiFetch(');
    // Also replace standalone fetch
    content = content.replace(/[^a-zA-Z0-9_]fetch\(/g, match => match[0] + 'apiFetch(');
    
    // Clean up inline Authorization headers since apiFetch handles it
    content = content.replace(/, headers: \{ 'Authorization': `Bearer \$\{localStorage\.getItem\('auth_token'\)\}`/g, '');
    content = content.replace(/, headers: \{ 'Authorization': `Bearer \$\{localStorage\.getItem\('auth_token'\)\}`, 'Content-Type': 'application\/json' \}/g, ', headers: { "Content-Type": "application/json" }');
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + path.basename(file));
  }
});
