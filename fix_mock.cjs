const fs = require('fs');
let code = fs.readFileSync('src/mocks/mockData.ts', 'utf8');

if (!code.includes("import { computeFactorWeightedTotal }")) {
  code = `import { computeFactorWeightedTotal, roundScore } from "../utils/score";\n` + code;
}

code = code.replace(
  /const totalScore = Math\.round\(\(\(factor1 \* 7 \+ factor2 \* 6 \+ factor3 \* 4 \+ factor4 \* 6\) \/ 23\) \* 100\) \/ 100;/,
  `const totalScore = computeFactorWeightedTotal(factor1, factor2, factor3, factor4);`
);

code = code.replace(
  /const totalFinal = \(d\.f1e \* 7 \+ d\.f2e \* 6 \+ d\.f3e \* 4 \+ d\.f4e \* 6\) \/ 23;/,
  `const totalFinal = computeFactorWeightedTotal(d.f1e, d.f2e, d.f3e, d.f4e);`
);

code = code.replace(
  /const totalStart = \(d\.f1s \* 7 \+ d\.f2s \* 6 \+ d\.f3s \* 4 \+ d\.f4s \* 6\) \/ 23;/,
  `const totalStart = computeFactorWeightedTotal(d.f1s, d.f2s, d.f3s, d.f4s);`
);

code = code.replace(
  /final_total:\s*\+totalFinal\.toFixed\(2\),/,
  `final_total:   totalFinal,`
);
code = code.replace(
  /growth_delta:\s*\+\(totalFinal - totalStart\)\.toFixed\(2\),/,
  `growth_delta:  roundScore(totalFinal - totalStart),`
);
code = code.replace(
  /lps:\s*\+\(0\.5 \+ \(totalFinal - 2\.5\) \* 0\.2\)\.toFixed\(2\),/,
  `lps:           roundScore(0.5 + (totalFinal - 2.5) * 0.2),`
);

fs.writeFileSync('src/mocks/mockData.ts', code);
console.log("Mock data updated.");
