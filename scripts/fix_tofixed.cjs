const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/JournalDetailPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. ScoreBadge
content = content.replace(
  '{score.toFixed(1)}',
  '{typeof score === "number" ? score.toFixed(1) : "—"}'
);

// 2. evalData.total_score
content = content.replace(
  'evalData.total_score.toFixed(2)',
  '(typeof evalData.total_score === "number" ? evalData.total_score.toFixed(2) : "—")'
);

// 3. fs[key].toFixed
content = content.replace(
  '{fs[key].toFixed(2)}',
  '{typeof fs[key] === "number" ? fs[key].toFixed(2) : "—"}'
);

// 4. avg.toFixed
content = content.replace(
  'avg.toFixed(2)',
  '(typeof avg === "number" ? avg.toFixed(2) : "—")'
);

// 5. growthUntilNow.slice(-1)[0]?.total.toFixed
content = content.replace(
  'growthUntilNow.slice(-1)[0]?.total.toFixed(2)',
  '(typeof growthUntilNow.slice(-1)[0]?.total === "number" ? growthUntilNow.slice(-1)[0].total.toFixed(2) : "—")'
);

// 6. formatter val.toFixed
content = content.replace(
  'val.toFixed(2)',
  '(typeof val === "number" ? val.toFixed(2) : String(val))'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed toFixed issues in JournalDetailPage.tsx');
