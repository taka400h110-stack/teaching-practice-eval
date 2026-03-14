const fs = require('fs');
const file = '/home/user/webapp/src/pages/HumanEvaluationPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/import { computeStrictScores } from "\.\.\/utils\/score";\n/g, '');
content = content.replace(/import \{\n\s*RUBRIC_ITEMS,\n/g, 'import {\n');
content = content.replace(/getItemsByFactor,\n/g, '');

fs.writeFileSync(file, content);
