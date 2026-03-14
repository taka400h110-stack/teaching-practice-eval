const fs = require('fs');
let code = fs.readFileSync('src/main.tsx', 'utf8');

if (!code.includes("ThemeProvider")) {
  code = code.replace(
    /import App from "\.\/App";/,
    `import { ThemeProvider } from "@mui/material/styles";\nimport { CssBaseline } from "@mui/material";\nimport { theme } from "./theme";\nimport App from "./App";`
  );
  
  code = code.replace(
    /<BrowserRouter>/,
    `<ThemeProvider theme={theme}>\n      <CssBaseline />\n      <BrowserRouter>`
  );
  
  code = code.replace(
    /<\/BrowserRouter>/,
    `</BrowserRouter>\n      </ThemeProvider>`
  );
  
  fs.writeFileSync('src/main.tsx', code);
  console.log("main.tsx updated with ThemeProvider.");
} else {
  console.log("ThemeProvider already in main.tsx");
}
