const fs = require('fs');
let code = fs.readFileSync('src/pages/JournalDetailPage.tsx', 'utf8');

// replace the average calculation with the one from API
code = code.replace(
  /const avg   = items\.length > 0 \? items\.reduce\(\(s, it\) => s \+ \(it\.score \|\| 0\), 0\) \/ items\.length : 0;/,
  `const avg = evalData.factor_scores ? evalData.factor_scores[key as keyof typeof evalData.factor_scores] : (items.length > 0 ? items.reduce((s, it) => s + (it.score || 0), 0) / items.length : 0);`
);

fs.writeFileSync('src/pages/JournalDetailPage.tsx', code);
console.log("JournalDetailPage updated.");
