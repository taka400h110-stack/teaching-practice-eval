const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

// Add imports
if (!appCode.includes('SCATBatchAnalysisPage')) {
  appCode = appCode.replace(
    /import \{ SCATAnalysisPage \} from '\.\/pages\/SCATAnalysisPage';/,
    "import { SCATAnalysisPage } from './pages/SCATAnalysisPage';\nimport { SCATBatchAnalysisPage } from './pages/SCATBatchAnalysisPage';\nimport { SCATNetworkAnalysisPage } from './pages/SCATNetworkAnalysisPage';"
  );
  
  // Add routes
  appCode = appCode.replace(
    /<Route path="\/scat" element=\{<SCATAnalysisPage \/>\} \/>/,
    `<Route path="/scat" element={<SCATAnalysisPage />} />
            <Route path="/scat-batch" element={<SCATBatchAnalysisPage />} />
            <Route path="/scat-network" element={<SCATNetworkAnalysisPage />} />`
  );
  
  fs.writeFileSync(appPath, appCode);
  console.log('Added SCAT batch and network routes to App.tsx');
}
