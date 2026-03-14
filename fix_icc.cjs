const fs = require('fs');

let file = fs.readFileSync('src/api/routes/stats.ts', 'utf8');

file = file.replace(/human_total: number\[\];/, 'human_total: number[] | number[][];');
file = file.replace(/human_by_factor: Record<string, number\[\]>;/, 'human_by_factor: Record<string, number[] | number[][]>;');

file = file.replace(/computeICC21\(\[body\.ai_total, body\.human_total\]\)/,
  `computeICC21([body.ai_total, ...(Array.isArray(body.human_total[0]) ? (body.human_total as number[][]) : [body.human_total as number[]])])`);

file = file.replace(/computeKrippendorffsAlpha\(\n        \[body\.ai_total, body\.human_total\],/,
  `computeKrippendorffsAlpha(
        [body.ai_total, ...(Array.isArray(body.human_total[0]) ? (body.human_total as number[][]) : [body.human_total as number[]])],`);

file = file.replace(/const r = pearsonR\(body\.ai_total, body\.human_total\);/,
  `const humanAvg = Array.isArray(body.human_total[0]) ? body.ai_total.map((_, i) => mean((body.human_total as number[][]).map(r => r[i]))) : body.human_total as number[];
        const r = pearsonR(body.ai_total, humanAvg);`);
        
file = file.replace(/const n = Math\.min\(body\.ai_total\.length, body\.human_total\.length\);/,
  `const n = Math.min(body.ai_total.length, humanAvg.length);`);

file = file.replace(/computeBlandAltman\(body\.ai_total, body\.human_total\)/,
  `computeBlandAltman(body.ai_total, Array.isArray(body.human_total[0]) ? body.ai_total.map((_, i) => mean((body.human_total as number[][]).map(r => r[i]))) : body.human_total as number[])`);

// also fix factor loop
file = file.replace(/const ai = body\.ai_by_factor\[factor\];\n      const human = body\.human_by_factor\[factor\];\n      if \(!ai \|\| !human\) continue;\n\n      const r = pearsonR\(ai, human\);\n      const n = Math\.min\(ai\.length, human\.length\);\n      factorResults\[factor\] = \{\n        icc: computeICC21\(\[ai, human\]\),\n        bland_altman: computeBlandAltman\(ai, human\),/,
`const ai = body.ai_by_factor[factor];
      const human = body.human_by_factor[factor];
      if (!ai || !human) continue;
      
      const humanMatrix = Array.isArray(human[0]) ? (human as unknown as number[][]) : [human as number[]];
      const humanAvgF = Array.isArray(human[0]) ? ai.map((_, i) => mean((human as unknown as number[][]).map(r => r[i]))) : human as number[];

      const r = pearsonR(ai, humanAvgF);
      const n = Math.min(ai.length, humanAvgF.length);
      factorResults[factor] = {
        icc: computeICC21([ai, ...humanMatrix]),
        bland_altman: computeBlandAltman(ai, humanAvgF),`);

fs.writeFileSync('src/api/routes/stats.ts', file);
