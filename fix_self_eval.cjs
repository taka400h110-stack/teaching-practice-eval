const fs = require('fs');
let code = fs.readFileSync('src/pages/SelfEvaluationPage.tsx', 'utf8');

if (!code.includes("import { computeFactorWeightedTotal }")) {
  code = code.replace(
    /import type \{ SelfEvaluation \} from "\.\.\/types";/,
    `import type { SelfEvaluation } from "../types";\nimport { computeFactorWeightedTotal } from "../utils/score";`
  );
}

code = code.replace(
  /const total = Math\.round\(\(\(scores\.factor1 \* 7 \+ scores\.factor2 \* 6 \+ scores\.factor3 \* 4 \+ scores\.factor4 \* 6\) \/ 23\) \* 100\) \/ 100;/,
  `const total = computeFactorWeightedTotal(scores.factor1, scores.factor2, scores.factor3, scores.factor4);`
);

fs.writeFileSync('src/pages/SelfEvaluationPage.tsx', code);
console.log("SelfEvaluationPage updated.");
