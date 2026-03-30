const fs = require('fs');

const path = 'src/api/routes/openai.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const apiKey = \(c\.env as any\)\?\.process\.env\.OPENAI_API_KEY;/g,
  "const apiKey = (c.env as any)?.OPENAI_API_KEY || (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined);"
);

fs.writeFileSync(path, code);
console.log("Patched openai.ts");
