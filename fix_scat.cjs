const fs = require('fs');
let code = fs.readFileSync('src/pages/SCATAnalysisPage.tsx', 'utf8');

// Update Typography to not just noWrap but handle overflow properly
code = code.replace(
  '<Typography variant="body2" noWrap sx={{ flex: 1, ml: 1 }}>{row.text.slice(0, 60) || "（空欄）"}</Typography>',
  '<Typography variant="body2" sx={{ flex: 1, ml: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.text || "（空欄）"}</Typography>'
);

fs.writeFileSync('src/pages/SCATAnalysisPage.tsx', code);
console.log("Updated SCATAnalysisPage.tsx");
