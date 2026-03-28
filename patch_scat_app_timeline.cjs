const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

// Add imports
if (!appCode.includes('SCATTimelinePage')) {
  appCode = appCode.replace(
    /import \{ SCATNetworkAnalysisPage \} from '\.\/pages\/SCATNetworkAnalysisPage';/,
    "import { SCATNetworkAnalysisPage } from './pages/SCATNetworkAnalysisPage';\nimport { SCATTimelinePage } from './pages/SCATTimelinePage';"
  );
  
  // Add routes
  appCode = appCode.replace(
    /<Route path="\/scat-network" element=\{<SCATNetworkAnalysisPage \/>\} \/>/,
    `<Route path="/scat-network" element={<SCATNetworkAnalysisPage />} />
            <Route path="/scat-timeline" element={<SCATTimelinePage />} />`
  );
  
  fs.writeFileSync(appPath, appCode);
  console.log('Added SCAT timeline route to App.tsx');
}
