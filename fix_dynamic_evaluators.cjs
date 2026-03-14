const fs = require('fs');

// Function to update ComparisonPage.tsx
let compCode = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');

// Replace "3名平均" or "3名の平均値" with more generic/dynamic terms "人間評価（平均）" or "複数名平均"
compCode = compCode.replace(/人間評価（3名平均）/g, '人間評価（平均）');
compCode = compCode.replace(/人間評価スコア（3名平均）/g, '人間評価スコア（平均）');
compCode = compCode.replace(/3名の平均値/g, '複数評価者の平均値');

fs.writeFileSync('src/pages/ComparisonPage.tsx', compCode);

// Function to update ReliabilityAnalysisPage.tsx
let relCode = fs.readFileSync('src/pages/ReliabilityAnalysisPage.tsx', 'utf8');

relCode = relCode.replace(/評価者3名の平均値/g, '複数評価者の平均値');
relCode = relCode.replace(/人間評価（3名平均）/g, '人間評価（平均）');

fs.writeFileSync('src/pages/ReliabilityAnalysisPage.tsx', relCode);

// Function to update EvaluationsPage.tsx
let evalsCode = fs.readFileSync('src/pages/EvaluationsPage.tsx', 'utf8');

evalsCode = evalsCode.replace(/3名平均分析用データ/g, '複数名平均分析用データ');

fs.writeFileSync('src/pages/EvaluationsPage.tsx', evalsCode);

console.log("Replaced 3-rater specific text with generic multi-rater text.");
