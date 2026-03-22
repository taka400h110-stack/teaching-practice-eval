const fs = require('fs');

let content = fs.readFileSync('src/api/routes/stats.ts', 'utf8');

// Remove the dangling catch block
content = content.replace(/\n  \} catch \(err\) \{\n    return c\.json\(\{ error: String\(err\) \}, 500\);\n  \}\n\}\);\n\n\nstatsRouter\.get\("\/ai-vs-human"/, '\nstatsRouter.get("/ai-vs-human"');

fs.writeFileSync('src/api/routes/stats.ts', content);
console.log("Fixed stats.ts syntax");
