const fs = require('fs');

// Patch CohortsManagementPage.tsx
const cohortsFile = 'src/pages/CohortsManagementPage.tsx';
let cohortsCode = fs.readFileSync(cohortsFile, 'utf8');

cohortsCode = cohortsCode.replace(
  /p\.big_five\[k\]/g,
  '(p.big_five?.[k] ?? 0)'
);

cohortsCode = cohortsCode.replace(
  /p\.big_five\.extraversion/g,
  '(p.big_five?.extraversion ?? 0)'
);

cohortsCode = cohortsCode.replace(
  /p\.final_total(?!\s*:)/g,
  '(p.final_total ?? 0)'
);

fs.writeFileSync(cohortsFile, cohortsCode, 'utf8');
console.log('Patched CohortsManagementPage.tsx');

// Patch StatisticsPage.tsx
const statsFile = 'src/pages/StatisticsPage.tsx';
let statsCode = fs.readFileSync(statsFile, 'utf8');

// Replace standard toFixed calls
const replacements = [
  { from: /p\.final_factor1\.toFixed\(/g, to: '(p.final_factor1 ?? 0).toFixed(' },
  { from: /p\.final_factor2\.toFixed\(/g, to: '(p.final_factor2 ?? 0).toFixed(' },
  { from: /p\.final_factor3\.toFixed\(/g, to: '(p.final_factor3 ?? 0).toFixed(' },
  { from: /p\.final_factor4\.toFixed\(/g, to: '(p.final_factor4 ?? 0).toFixed(' },
  { from: /p\.final_total\.toFixed\(/g, to: '(p.final_total ?? 0).toFixed(' },
  { from: /p\.growth_delta\.toFixed\(/g, to: '(p.growth_delta ?? 0).toFixed(' },
  { from: /p\.big_five\.extraversion\.toFixed\(/g, to: '(p.big_five?.extraversion ?? 0).toFixed(' },
  { from: /p\.big_five\.agreeableness\.toFixed\(/g, to: '(p.big_five?.agreeableness ?? 0).toFixed(' },
  { from: /p\.big_five\.conscientiousness\.toFixed\(/g, to: '(p.big_five?.conscientiousness ?? 0).toFixed(' },
  { from: /p\.big_five\.neuroticism\.toFixed\(/g, to: '(p.big_five?.neuroticism ?? 0).toFixed(' },
  { from: /p\.big_five\.openness\.toFixed\(/g, to: '(p.big_five?.openness ?? 0).toFixed(' },
  { from: /ws\.factor1\.toFixed\(/g, to: '(ws.factor1 ?? 0).toFixed(' },
  { from: /ws\.factor2\.toFixed\(/g, to: '(ws.factor2 ?? 0).toFixed(' },
  { from: /ws\.factor3\.toFixed\(/g, to: '(ws.factor3 ?? 0).toFixed(' },
  { from: /ws\.factor4\.toFixed\(/g, to: '(ws.factor4 ?? 0).toFixed(' },
  { from: /ws\.total\.toFixed\(/g, to: '(ws.total ?? 0).toFixed(' },
  { from: /v\.toFixed\(/g, to: '(v ?? 0).toFixed(' }
];

replacements.forEach(r => {
  statsCode = statsCode.replace(r.from, r.to);
});

fs.writeFileSync(statsFile, statsCode, 'utf8');
console.log('Patched StatisticsPage.tsx');

