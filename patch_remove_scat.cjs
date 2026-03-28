const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

appCode = appCode.replace(/<Route path="scat-batch"[\s\S]*?<\/PrivateRoute>\} \/>\n/g, '');
appCode = appCode.replace(/<Route path="scat-network"[\s\S]*?<\/PrivateRoute>\} \/>\n/g, '');
appCode = appCode.replace(/<Route path="scat-timeline"[\s\S]*?<\/PrivateRoute>\} \/>\n/g, '');

fs.writeFileSync(appPath, appCode);
console.log('Removed SCAT network/timeline/batch routes temporarily for test');
