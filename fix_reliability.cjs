const fs = require('fs');
let code = fs.readFileSync('src/pages/ReliabilityAnalysisPage.tsx', 'utf8');

code = code.replace(
  '<Typography variant="h5" fontWeight={700}>信頼性・妥当性分析 (ICC / Bland-Altman)</Typography>',
  '<Typography variant="h5" fontWeight={700}>信頼性・妥当性分析 (AI vs 人間3名平均)</Typography>'
);

code = code.replace(
  '「信頼性を計算」ボタンを押してください。AI評価スコアと人間評価スコアの比較分析を実行します。',
  '「信頼性を計算」ボタンを押してください。AI評価スコアと人間評価スコア（評価者3名の平均値）の比較分析を実行します。'
);

code = code.replace(
  'AI評価 vs 人間評価 散布図',
  'AI評価 vs 人間評価（3名平均） 散布図'
);

code = code.replace(
  'Bland-Altman プロット（AI評価 − 人間評価）',
  'Bland-Altman プロット（AI評価 − 人間評価平均）'
);

code = code.replace(
  'label={{ value: "人間評価スコア", angle: -90, position: "insideLeft", offset: 10 }}',
  'label={{ value: "人間評価スコア（平均）", angle: -90, position: "insideLeft", offset: 10 }}'
);

code = code.replace(
  '因子別 Pearson r（AI vs 人間評価）',
  '因子別 Pearson r（AI vs 人間評価平均）'
);

fs.writeFileSync('src/pages/ReliabilityAnalysisPage.tsx', code);
console.log("Updated ReliabilityAnalysisPage.tsx");
