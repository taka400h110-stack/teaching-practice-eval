const fs = require('fs');
const file = '/home/user/webapp/src/pages/GrowthVisualizationPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// replace `.toFixed(2)` with `(s.total||0).toFixed(2)` etc where applicable, but we can do a global fix by filtering out scores or defining safe fallbacks.
// Actually, let's just add a filter at the beginning:
const filterCode = `  const scores    = growth.weekly_scores;
  const latest    = scores[scores.length - 1];`;

const newFilterCode = `  const scores    = (growth.weekly_scores || []).map(s => ({
    ...s,
    total: s.total || 0,
    factor1: s.factor1 || 0,
    factor2: s.factor2 || 0,
    factor3: s.factor3 || 0,
    factor4: s.factor4 || 0,
  }));
  const latest    = scores[scores.length - 1];`;

code = code.replace(filterCode, newFilterCode);

fs.writeFileSync(file, code);
console.log('Fixed GrowthVisualizationPage.tsx');
