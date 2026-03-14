const fs = require('fs');
let code = fs.readFileSync('src/pages/ComparisonPage.tsx', 'utf8');

// Replace standard "人間評価" with "人間評価（3名平均）" in charts and text.
// But only where it makes sense as a label.
code = code.replace(/name="人間評価"/g, 'name="人間評価（3名平均）"');
code = code.replace(
  'label={{ value: "人間評価スコア", angle: -90, position: "insideLeft" }}',
  'label={{ value: "人間評価スコア（3名平均）", angle: -90, position: "insideLeft" }}'
);
code = code.replace(
  '<Typography variant="h5" fontWeight={700}>AI vs 人間評価 比較分析</Typography>',
  '<Typography variant="h5" fontWeight={700}>AI vs 人間評価（3名平均） 比較分析</Typography>'
);
code = code.replace(
  'AI評価 vs 人間評価 散布図（23項目）',
  'AI評価 vs 人間評価（3名平均） 散布図（23項目）'
);
code = code.replace(
  'Pearson r = 0.87（p &lt; .001）。AIと人間評価の間に強い正の相関。',
  'Pearson r = 0.87（p &lt; .001）。AIと人間評価（3名の平均値）の間に強い正の相関。'
);

// We need to change the header of the table "人間" to "人間(3名平均)"
code = code.replace(
  '["#", "因子", "評価項目", "AI", "人間", "差異 (AI-人間)"]',
  '["#", "因子", "評価項目", "AI", "人間(平均)", "差異 (AI-人間)"]'
);

fs.writeFileSync('src/pages/ComparisonPage.tsx', code);
console.log("Updated ComparisonPage.tsx");
