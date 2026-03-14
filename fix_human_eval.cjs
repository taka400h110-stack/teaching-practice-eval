const fs = require('fs');

let code = fs.readFileSync('src/pages/HumanEvaluationPage.tsx', 'utf-8');

// computeStrictScores がインポートされていないので追加する
if (!code.includes('computeStrictScores')) {
  // すでに含まれているので何もしない、ただimport文が欠落しているだけ。
}

code = code.replace(
  /import \{\n  RUBRIC_ITEMS,\n  RUBRIC_FACTORS,\n  REFLECTION_DEPTH_LEVELS,\n  getItemsByFactor,\n  getRdByScore,\n\} from "\.\.\/constants\/rubric";/g,
  `import {\n  RUBRIC_ITEMS,\n  RUBRIC_FACTORS,\n  REFLECTION_DEPTH_LEVELS,\n  getItemsByFactor,\n  getRdByScore,\n} from "../constants/rubric";\nimport { computeStrictScores } from "../utils/score";`
);

fs.writeFileSync('src/pages/HumanEvaluationPage.tsx', code);
