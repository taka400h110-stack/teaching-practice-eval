const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/LongitudinalAnalysisPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove @ts-nocheck
content = content.replace('// @ts-nocheck\n', '');

// 2. Add imports
const importsToAdd = `import {
  CohortProfile,
  LGCMResult,
  LCGAResult,
  WeeklyStat,
  OverlayPlotData,
  AnalysisStatus,
  LCGATrajectoryClass,
  LCGAClass
} from "../types/longitudinal";
`;

content = content.replace('import { apiFetch } from "../api/client";\n', 'import { apiFetch } from "../api/client";\n' + importsToAdd + '\n');

// 3. Fix genLCGATrajectories
const genLCGAOld = `function genLCGATrajectories(weeks: number, lcgaResult: any) {
  const classes = lcgaResult?.classes || [
    { class_id: 1, proportion: 0.45, intercept: 2.5, slope: 0.15 },
    { class_id: 2, proportion: 0.35, intercept: 2.0, slope: 0.20 },
    { class_id: 3, proportion: 0.20, intercept: 1.5, slope: 0.25 }
  ];
  return classes.map((c: any) => ({ id: String(c.class_id), label: \`Class \${c.class_id} (\${Math.round(c.proportion*100)}%)\`, color: c.class_id === 1 ? '#2e7d32' : c.class_id === 2 ? '#1565c0' : '#e65100', pct: Math.round(c.proportion*100), desc: \`軌跡: y = \${c.intercept} \${c.slope>=0?'+':''} \${c.slope}x\`, initScore: c.intercept, finalScore: +(c.intercept + c.slope * 10).toFixed(2), slope: c.slope })).map((cls: any) => ({
    ...cls,
    trajectory: Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      score: Math.min(5, +(cls.initScore + cls.slope * i).toFixed(2)),
    })),
  }));
}`;

const genLCGANew = `function genLCGATrajectories(weeks: number, lcgaResult: LCGAResult | null, isSample: boolean): LCGATrajectoryClass[] {
  let classes: LCGAClass[] = [];
  if (lcgaResult?.classes && lcgaResult.classes.length > 0) {
    classes = lcgaResult.classes;
  } else if (isSample) {
    classes = [
      { class_id: 1, proportion: 0.45, intercept: 2.5, slope: 0.15 },
      { class_id: 2, proportion: 0.35, intercept: 2.0, slope: 0.20 },
      { class_id: 3, proportion: 0.20, intercept: 1.5, slope: 0.25 }
    ];
  } else {
    return [];
  }

  return classes.map((c: LCGAClass) => ({ 
    id: String(c.class_id), 
    label: \`Class \${c.class_id} (\${Math.round(c.proportion*100)}%)\`, 
    color: c.class_id === 1 ? '#2e7d32' : c.class_id === 2 ? '#1565c0' : '#e65100', 
    pct: Math.round(c.proportion*100), 
    desc: \`軌跡: y = \${c.intercept} \${c.slope>=0?'+':''} \${c.slope}x\`, 
    initScore: c.intercept, 
    finalScore: +(c.intercept + c.slope * weeks).toFixed(2), 
    slope: c.slope 
  })).map((cls) => ({
    ...cls,
    trajectory: Array.from({ length: weeks }, (_, i) => ({
      week: i + 1,
      score: Math.min(5, Math.max(1, +(cls.initScore + cls.slope * i).toFixed(2))),
    })),
  }));
}`;

content = content.replace(genLCGAOld, genLCGANew);

// 4. Fix LGCM_RESULT
content = content.replace('const LGCM_RESULT =', 'const LGCM_RESULT: LGCMResult =');

// 5. Fix downloadGrowthCSV
content = content.replace('function downloadGrowthCSV(weeklyStats: any[]) {', 'function downloadGrowthCSV(weeklyStats: WeeklyStat[]) {');

// 6. Fix downloadLGCMCSV
content = content.replace('function downloadLGCMCSV(lgcmResult: any) {', 'function downloadLGCMCSV(lgcmResult: LGCMResult | null) {');
content = content.replace('[\"Intercept mean\", lgcmResult?.intercept_mean, \"初期値の平均\"],', '[\"Intercept mean\", lgcmResult?.intercept_mean ?? \"\", \"初期値の平均\"],');
content = content.replace('[\"Intercept variance\", lgcmResult?.intercept_variance, \"初期値の個人差\"],', '[\"Intercept variance\", lgcmResult?.intercept_variance ?? \"\", \"初期値の個人差\"],');
content = content.replace('[\"Slope mean\", lgcmResult?.slope_mean, \"成長率の平均（週単位）\"],', '[\"Slope mean\", lgcmResult?.slope_mean ?? \"\", \"成長率の平均（週単位）\"],');
content = content.replace('[\"Slope variance\", lgcmResult?.slope_variance, \"成長率の個人差\"],', '[\"Slope variance\", lgcmResult?.slope_variance ?? \"\", \"成長率の個人差\"],');
content = content.replace('[\"Intercept-Slope Cov\", lgcmResult?.intercept_slope_cov, \"初期値と成長率の関係\"],', '[\"Intercept-Slope Cov\", lgcmResult?.intercept_slope_cov ?? \"\", \"初期値と成長率の共分散\"],'); 
content = content.replace(/lgcmResult\?\.cfi/g, 'lgcmResult?.cfi ?? \"\"');
content = content.replace(/lgcmResult\?\.rmsea/g, 'lgcmResult?.rmsea ?? \"\"');
content = content.replace(/lgcmResult\?\.srmr/g, 'lgcmResult?.srmr ?? \"\"');
content = content.replace(/\`\$\{lgcmResult\?\.chi2\}\(\$\{lgcmResult\?\.chi2_df\}\)\`/g, 'lgcmResult ? \`\${lgcmResult.chi2}(\${lgcmResult.chi2_df})\` : \"\"');
content = content.replace(/\`p<\$\{lgcmResult\?\.chi2_p\}\`/g, 'lgcmResult ? \`p<\${lgcmResult.chi2_p}\` : \"\"');


// Write back to see progress
fs.writeFileSync(filePath, content, 'utf8');
console.log('Done 1-6');
