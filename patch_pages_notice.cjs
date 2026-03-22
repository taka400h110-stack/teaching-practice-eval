const fs = require('fs');

function addNotice(filePath, insertAfter, notice) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(notice)) return;
  content = content.replace(insertAfter, insertAfter + '\n' + notice);
  fs.writeFileSync(filePath, content);
}

// Add Alert import if missing
function ensureAlert(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('Alert,')) {
    content = content.replace('Box,', 'Box, Alert,');
    fs.writeFileSync(filePath, content);
  }
}

// AdvancedAnalyticsPage
let path = 'src/pages/AdvancedAnalyticsPage.tsx';
if (fs.existsSync(path)) {
  ensureAlert(path);
  addNotice(path, '<Typography variant="h4" gutterBottom>', '        <Alert severity="info" sx={{ mb: 3 }}>注記: 以下の高度な統計分析（ANOVA, MCAR検定, 多重代入法など）の結果は、外部ソフトウェア（R/SPSS等）で算出された結果の表示用モック（またはプレースホルダー）です。本システム内での直接計算は行われていません。</Alert>');
}

// InternationalComparisonPage
path = 'src/pages/InternationalComparisonPage.tsx';
if (fs.existsSync(path)) {
  ensureAlert(path);
  addNotice(path, '<Typography variant="h4" component="h1" gutterBottom>', '        <Alert severity="info" sx={{ mb: 3 }}>注記: 以下の分散分析（ANOVA）および多重比較の結果は、外部ソフトウェアで算出された結果の表示用です。</Alert>');
}

console.log("Notices added.");
