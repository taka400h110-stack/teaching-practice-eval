const fs = require('fs');

const file = 'src/pages/GrowthVisualizationPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// Replace standard toFixed calls with null-guarded ones
// specifically s.total.toFixed, s.factor1.toFixed, etc.
code = code.replace(/s\.total\.toFixed/g, '(s.total||0).toFixed');
code = code.replace(/s\.factor1\.toFixed/g, '(s.factor1||0).toFixed');
code = code.replace(/s\.factor2\.toFixed/g, '(s.factor2||0).toFixed');
code = code.replace(/s\.factor3\.toFixed/g, '(s.factor3||0).toFixed');
code = code.replace(/s\.factor4\.toFixed/g, '(s.factor4||0).toFixed');

code = code.replace(/se\.total\.toFixed/g, '(se.total||0).toFixed');
code = code.replace(/aiWeek\.total\.toFixed/g, '(aiWeek.total||0).toFixed');

code = code.replace(/first\.total\.toFixed/g, '(first?.total||0).toFixed');
code = code.replace(/latest\.total\.toFixed/g, '(latest?.total||0).toFixed');

code = code.replace(/scores\[0\]\[FACTOR_KEYS\[i\]\]\.toFixed/g, '(scores[0]?.[FACTOR_KEYS[i]]||0).toFixed');
code = code.replace(/scores\[scores\.length - 1\]\[FACTOR_KEYS\[i\]\]\.toFixed/g, '(scores[scores.length - 1]?.[FACTOR_KEYS[i]]||0).toFixed');

code = code.replace(/s\[fk\]\.toFixed/g, '(s[fk]||0).toFixed');
code = code.replace(/se\[fk\]\.toFixed/g, '(se[fk]||0).toFixed');
code = code.replace(/first\[fk\]\.toFixed/g, '(first?.[fk]||0).toFixed');
code = code.replace(/latest\[fk\]\.toFixed/g, '(latest?.[fk]||0).toFixed');
code = code.replace(/aiScore\?\.total\.toFixed/g, '(aiScore?.total||0).toFixed');

fs.writeFileSync(file, code, 'utf8');
console.log('Fixed GrowthVisualizationPage.tsx');
