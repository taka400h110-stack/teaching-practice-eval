const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

if (!code.includes("import \"./index.css\"")) {
  code = `import "./index.css";\n` + code;
  fs.writeFileSync('src/main.tsx', code);
  console.log("main.tsx updated with index.css.");
}
