const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

if (!code.includes("fonts.googleapis.com")) {
  const fonts = `    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />`;
  
  code = code.replace(/<title>/, `${fonts}\n    <title>`);
  fs.writeFileSync('index.html', code);
  console.log("index.html updated with Google Fonts.");
}
