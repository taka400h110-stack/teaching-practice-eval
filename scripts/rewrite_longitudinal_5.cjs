const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/LongitudinalAnalysisPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix imports to include WeeklyScore
content = content.replace('CohortProfile,', 'CohortProfile,\n  WeeklyScore,');

// Fix type casting for WeeklyStat
content = content.replace(/\(w as Record<string, number>\)/g, '(w as unknown as Record<string, number>)');
content = content.replace(/\(d as Record<string, number>\)/g, '(d as unknown as Record<string, number>)');

// Fix toFixed on LGCMResult properties which might be empty strings now
// They are supposed to be numbers, but the type allows string in the UI where it replaces undefined with ""
// Actually, LGCMResult has them as number, so we should just display them and not format, or we do conditional formatting.
content = content.replace(/value: lgcmResult\?\.cfi\.toFixed\(3\)/g, 'value: lgcmResult?.cfi ? lgcmResult.cfi.toFixed(3) : ""');
content = content.replace(/value: lgcmResult\?\.rmsea\.toFixed\(3\)/g, 'value: lgcmResult?.rmsea ? lgcmResult.rmsea.toFixed(3) : ""');
content = content.replace(/value: lgcmResult\?\.srmr\.toFixed\(4\)/g, 'value: lgcmResult?.srmr ? lgcmResult.srmr.toFixed(4) : ""');

// Fix `>= 0.90` and `<= 0.08` comparisons
content = content.replace(/ok: lgcmResult\?\.cfi >= 0\.90/g, 'ok: lgcmResult?.cfi ? lgcmResult.cfi >= 0.90 : false');
content = content.replace(/ok: lgcmResult\?\.rmsea <= 0\.08/g, 'ok: lgcmResult?.rmsea ? lgcmResult.rmsea <= 0.08 : false');
content = content.replace(/ok: lgcmResult\?\.srmr <= 0\.08/g, 'ok: lgcmResult?.srmr ? lgcmResult.srmr <= 0.08 : false');

fs.writeFileSync(filePath, content, 'utf8');
