const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

if (!appCode.includes('SCATNetworkAnalysisPage')) {
  appCode = appCode.replace(/const SCATBatchAnalysisPage   = lazy\(\(\) => import\("\.\/pages\/SCATBatchAnalysisPage"\)\);\n/g, 'const SCATBatchAnalysisPage   = lazy(() => import("./pages/SCATBatchAnalysisPage"));\nconst SCATNetworkAnalysisPage = lazy(() => import("./pages/SCATNetworkAnalysisPage"));\nconst SCATTimelinePage        = lazy(() => import("./pages/SCATTimelinePage"));\n');

  appCode = appCode.replace(/<Route path="scat-batch"        element=\{<PrivateRoute allowedRoles=\{\["researcher", "admin", "collaborator", "board_observer"\]\}><SCATBatchAnalysisPage \/><\/PrivateRoute>\} \/>\n/g, '<Route path="scat-batch"        element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATBatchAnalysisPage /></PrivateRoute>} />\n          <Route path="scat-network"      element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATNetworkAnalysisPage /></PrivateRoute>} />\n          <Route path="scat-timeline"     element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATTimelinePage /></PrivateRoute>} />\n');

  fs.writeFileSync(appPath, appCode);
  console.log('Restored all SCAT imports in App.tsx');
}
