const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/LongitudinalAnalysisPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('const [lgcmDone, setLgcmDone] = useState(false);\n', '');
content = content.replace('setLgcmDone(true);\n', '');

content = content.replace('{lgcmDone && (', '{(lgcmStatus === "completed" || lgcmStatus === "sample") && (');

fs.writeFileSync(filePath, content, 'utf8');
