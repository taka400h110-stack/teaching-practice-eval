const fs = require('fs');

let content = fs.readFileSync('src/pages/LongitudinalAnalysisPage.tsx', 'utf8');

// Add Alert to LCGA tab
const lcgaSearch = '<Typography variant="subtitle1" fontWeight={700} gutterBottom>\n                  LCGA 潜在クラス別 成長軌跡（3クラスモデル）\n                </Typography>';
const lcgaNotice = `                <Alert severity="info" sx={{ mb: 2 }}>
                  注記: 以下のLCGA（潜在クラス成長分析）の結果は、外部ソフトウェア（Mplus/R等）で算出された結果の表示用モックです。本システム内での自動計算は行われていません。
                </Alert>\n`;
if (!content.includes('LCGA（潜在クラス成長分析）の結果は')) {
  content = content.replace(lcgaSearch, lcgaNotice + lcgaSearch);
}

// Add Alert to paired t-test tab
const ttestSearch = '<Typography variant="subtitle1" fontWeight={700} gutterBottom>\n                  ペアt検定 結果（実習前後 差の検定）\n                </Typography>';
const ttestNotice = `                <Alert severity="info" sx={{ mb: 2 }}>
                  注記: 以下のペアt検定およびCohen's dの効果量は、外部ソフトウェアで算出された結果の表示用モックです。
                </Alert>\n`;
if (!content.includes('ペアt検定およびCohen')) {
  content = content.replace(ttestSearch, ttestNotice + ttestSearch);
}

// Fix the map index out of bounds if lcgaResult is null
const lcgaPctFix = `({(lcgaResult?.classes?.map((c: any) => ({ pct: Math.round(c.proportion*100) })) || [{pct: 45}, {pct: 35}, {pct: 20}])[0].pct}%)`;
content = content.replace(/\{\(lcgaResult\?\.classes\?\.map\(\(c: any\) => \(\{.*\}\)\) \|\| \[\]\)\[0\]\.pct\}%\)/g, lcgaPctFix);
content = content.replace(/\{\(lcgaResult\?\.classes\?\.map\(\(c: any\) => \(\{.*\}\)\) \|\| \[\]\)\[1\]\.pct\}%\)/g, `({(lcgaResult?.classes?.map((c: any) => ({ pct: Math.round(c.proportion*100) })) || [{pct: 45}, {pct: 35}, {pct: 20}])[1].pct}%)`);
content = content.replace(/\{\(lcgaResult\?\.classes\?\.map\(\(c: any\) => \(\{.*\}\)\) \|\| \[\]\)\[2\]\.pct\}%\)/g, `({(lcgaResult?.classes?.map((c: any) => ({ pct: Math.round(c.proportion*100) })) || [{pct: 45}, {pct: 35}, {pct: 20}])[2].pct}%)`);

fs.writeFileSync('src/pages/LongitudinalAnalysisPage.tsx', content);
console.log('Fixed mocks in LongitudinalAnalysisPage');
