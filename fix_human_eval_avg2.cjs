const fs = require('fs');
let file = fs.readFileSync('src/pages/HumanEvaluationPage.tsx', 'utf8');
file = file.replace(/const totalAvgValue = \(\) => {\n    const validScores = RUBRIC_ITEMS.map\(i => scores\[i.num\]\).filter\(s => s != null\) as number\[\];\n    if \(validScores.length === 0\) return "0.00";\n    return \(Math.round\(\(validScores.reduce\(\(s, v\) => s \+ v, 0\) \/ validScores.length\) \* 100\) \/ 100\).toFixed\(2\);\n  };/m,
`  const validTotalScores = RUBRIC_ITEMS.map(i => scores[i.num]).filter(s => s != null) as number[];
  const totalAvg = validTotalScores.length > 0 
    ? (Math.round((validTotalScores.reduce((s, v) => s + v, 0) / validTotalScores.length) * 100) / 100).toFixed(2)
    : "0.00";`);
fs.writeFileSync('src/pages/HumanEvaluationPage.tsx', file);
