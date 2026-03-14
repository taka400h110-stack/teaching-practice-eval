const fs = require('fs');
let code = fs.readFileSync('src/pages/HumanEvaluationPage.tsx', 'utf8');

if (!code.includes("import { computeStrictScores }")) {
  code = code.replace(
    /import type \{ EvaluationResult, JournalEntry \} from "\.\.\/types";/,
    `import type { EvaluationResult, JournalEntry } from "../types";\nimport { computeStrictScores } from "../utils/score";`
  );
}

const replacement = `
  const itemsArray = RUBRIC_ITEMS.map((item) => ({
    item_number: item.num,
    score: scores[item.num],
    is_na: false
  }));
  const strictScores = computeStrictScores(itemsArray);

  const factorAvg = (factorKey: string) => {
    if (factorKey === "factor1") return strictScores.factor1_score?.toFixed(2) ?? "0.00";
    if (factorKey === "factor2") return strictScores.factor2_score?.toFixed(2) ?? "0.00";
    if (factorKey === "factor3") return strictScores.factor3_score?.toFixed(2) ?? "0.00";
    if (factorKey === "factor4") return strictScores.factor4_score?.toFixed(2) ?? "0.00";
    return "0.00";
  };
  
  const totalAvg = strictScores.total_score?.toFixed(2) ?? "0.00";
`;

const regex = /const factorAvg = \(factorKey: string\) => \{[\s\S]*?const totalAvg = validTotalScores\.length > 0 \s*\n\s*\? \(Math\.round\(\(validTotalScores\.reduce\(\(s, v\) => s \+ v, 0\) \/ validTotalScores\.length\) \* 100\) \/ 100\)\.toFixed\(2\)\s*\n\s*: "0\.00";/;

code = code.replace(regex, replacement.trim());

fs.writeFileSync('src/pages/HumanEvaluationPage.tsx', code);
console.log("HumanEvaluationPage updated.");
