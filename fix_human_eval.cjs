const fs = require('fs');

// 1. HumanEvaluationPage.tsx の修正
let humanFile = fs.readFileSync('src/pages/HumanEvaluationPage.tsx', 'utf-8');
humanFile = humanFile.replace(
  /mutationFn: async \(\) => { await new Promise\(\(r\) => setTimeout\(r, 600\)\); return scores; },/,
  `mutationFn: async () => {\n      const items = Object.entries(scores).map(([k, v]) => ({ item_number: parseInt(k), score: v }));\n      return mockApi.saveHumanEvaluation(journalId!, journal?.week_number || 1, items);\n    },`
);
fs.writeFileSync('src/pages/HumanEvaluationPage.tsx', humanFile);

// 2. EvaluationsPage.tsx の修正
let evalFile = fs.readFileSync('src/pages/EvaluationsPage.tsx', 'utf-8');

// (a) useQueryでgetHumanEvaluationsを取得するように追加
if (!evalFile.includes("getHumanEvaluations")) {
  evalFile = evalFile.replace(
    /const { data: allEvals = \[\] } = useQuery\(\{/,
    `const { data: humanEvals = [] } = useQuery({ queryKey: ["humanEvaluations"], queryFn: () => mockApi.getHumanEvaluations() });\n  const { data: allEvals = [] } = useQuery({`
  );
}

// (b) completedの判定を、isEvaluatorの場合は自分が評価済みかどうかで判断する
if (evalFile.includes('j.status === "evaluated" ? "completed" : "pending"')) {
  evalFile = evalFile.replace(
    /status:\s+j\.status === "evaluated" \? "completed" : "pending",/g,
    `status: isEvaluator ? (humanEvals.some(he => he.journal_id === j.id) ? "completed" : "pending") : (j.status === "evaluated" ? "completed" : "pending"),`
  );
}

fs.writeFileSync('src/pages/EvaluationsPage.tsx', evalFile);

console.log('Fixed HumanEvaluationPage and EvaluationsPage.');
