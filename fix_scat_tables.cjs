const fs = require('fs');
let code = fs.readFileSync('src/pages/SCATAnalysisPage.tsx', 'utf8');

// Add horizontal scrolling to TableContainers
code = code.replace(
  '<TableContainer component={Paper} variant="outlined">',
  '<TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>'
);
code = code.replace(
  '<TableContainer component={Paper} variant="outlined">', // There's a second one
  '<TableContainer component={Paper} variant="outlined" sx={{ overflowX: "auto" }}>'
);

fs.writeFileSync('src/pages/SCATAnalysisPage.tsx', code);
console.log("Updated SCATAnalysisPage.tsx");
