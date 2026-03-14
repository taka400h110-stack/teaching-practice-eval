const fs = require('fs');
let file = fs.readFileSync('src/pages/HumanEvaluationPage.tsx', 'utf8');
file = file.replace(/const factorAvg = \(factorKey: string\) => {[\s\S]*?};\n  const totalAvg = \([\s\S]*?  \)\.toFixed\(2\);/m, 
`const factorAvg = (factorKey: string) => {
    const items = RUBRIC_ITEMS.filter((i) => i.factor === factorKey);
    const validScores = items.map(i => scores[i.num]).filter(s => s != null) as number[];
    if (validScores.length === 0) return "0.00";
    return Math.round((validScores.reduce((s, v) => s + v, 0) / validScores.length) * 100) / 100;
  };
  const totalAvg = () => {
    const validScores = RUBRIC_ITEMS.map(i => scores[i.num]).filter(s => s != null) as number[];
    if (validScores.length === 0) return "0.00";
    return (Math.round((validScores.reduce((s, v) => s + v, 0) / validScores.length) * 100) / 100).toFixed(2);
  };`);
fs.writeFileSync('src/pages/HumanEvaluationPage.tsx', file);
