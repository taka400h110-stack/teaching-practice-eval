const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

appCode = appCode.replace(/const SCATBatchAnalysisPage[\s\S]*?\n/g, '');
appCode = appCode.replace(/const SCATNetworkAnalysisPage[\s\S]*?\n/g, '');
appCode = appCode.replace(/const SCATTimelinePage[\s\S]*?\n/g, '');

fs.writeFileSync(appPath, appCode);
console.log('Removed SCAT imports');
