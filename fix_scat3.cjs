const fs = require('fs');
let code = fs.readFileSync('src/pages/SCATAnalysisPage.tsx', 'utf8');

// The issue might be that AccordionSummary itself needs specific layout constraints to prevent its children from expanding it beyond the container
// Let's add sx={{ ".MuiAccordionSummary-content": { width: "calc(100% - 40px)", overflow: "hidden" } }} to AccordionSummary

code = code.replace(
  '<AccordionSummary expandIcon={<ExpandMoreIcon />}>',
  '<AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ ".MuiAccordionSummary-content": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", pr: 2 } }}>'
);

code = code.replace(
  '<Typography variant="body2" sx={{ flex: 1, ml: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.text || "（空欄）"}</Typography>',
  '<Typography variant="body2" sx={{ flex: 1, minWidth: 0, ml: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{row.text || "（空欄）"}</Typography>'
);

fs.writeFileSync('src/pages/SCATAnalysisPage.tsx', code);
console.log("Updated SCATAnalysisPage.tsx");
