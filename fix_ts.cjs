const fs = require('fs');

// Fix SCATAnalysisPage.tsx
let scat = fs.readFileSync('src/pages/SCATAnalysisPage.tsx', 'utf8');
scat = scat.replace(/coder1: \{ id: string; code: string \}\[\],/g, 'coder1: { id: string | number; code: string }[],');
scat = scat.replace(/coder2: \{ id: string; code: string \}\[\],/g, 'coder2: { id: string | number; code: string }[],');
fs.writeFileSync('src/pages/SCATAnalysisPage.tsx', scat);

// Fix stats.ts
let stats = fs.readFileSync('src/api/routes/stats.ts', 'utf8');
stats = stats.replace(/const validIndices = \[\];/, 'const validIndices: number[] = [];');
fs.writeFileSync('src/api/routes/stats.ts', stats);

