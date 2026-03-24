const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/LongitudinalAnalysisPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix myScores
content = content.replace('const myScores = (growthData?.[0] ?? []).map((ws) => ({\n    week: ws.week, ...ws,\n  }));', 'const myScores = growthData?.[0] ?? [];');

// Fix LGCMResult value formatting
content = content.replace(/value: lgcmResult\?\.cfi \?\? \"\"\.toFixed\(3\)/g, 'value: typeof lgcmResult?.cfi === "number" ? lgcmResult.cfi.toFixed(3) : ""');
content = content.replace(/value: lgcmResult\?\.rmsea \?\? \"\"\.toFixed\(3\)/g, 'value: typeof lgcmResult?.rmsea === "number" ? lgcmResult.rmsea.toFixed(3) : ""');
content = content.replace(/value: lgcmResult\?\.srmr \?\? \"\"\.toFixed\(4\)/g, 'value: typeof lgcmResult?.srmr === "number" ? lgcmResult.srmr.toFixed(4) : ""');

// Fix LGCMResult ok comparisons
content = content.replace(/ok: lgcmResult\?\.cfi \?\? \"\" >= 0\.90/g, 'ok: typeof lgcmResult?.cfi === "number" ? lgcmResult.cfi >= 0.90 : false');
content = content.replace(/ok: lgcmResult\?\.rmsea \?\? \"\" <= 0\.08/g, 'ok: typeof lgcmResult?.rmsea === "number" ? lgcmResult.rmsea <= 0.08 : false');
content = content.replace(/ok: lgcmResult\?\.srmr \?\? \"\" <= 0\.08/g, 'ok: typeof lgcmResult?.srmr === "number" ? lgcmResult.srmr <= 0.08 : false');

fs.writeFileSync(filePath, content, 'utf8');
