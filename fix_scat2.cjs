const fs = require('fs');
let code = fs.readFileSync('src/pages/SCATAnalysisPage.tsx', 'utf8');

// The issue might be that the width="100%" or flex: 1 combined with Box in AccordionSummary isn't properly constraining the text.
// We need to ensure the container of Typography has minWidth: 0 or overflow: hidden too.

code = code.replace(
  '<Box display="flex" alignItems="center" gap={1} width="100%">',
  '<Box display="flex" alignItems="center" gap={1} sx={{ width: "100%", overflow: "hidden" }}>'
);

fs.writeFileSync('src/pages/SCATAnalysisPage.tsx', code);
console.log("Updated SCATAnalysisPage.tsx");
