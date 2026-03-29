const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

// Lazy load imports
if (!appCode.includes('SCATBatchAnalysisPage')) {
  appCode = appCode.replace(
    /const SCATAnalysisPage        = lazy\(\(\) => import\("\.\/pages\/SCATAnalysisPage"\)\);/,
    `const SCATAnalysisPage        = lazy(() => import("./pages/SCATAnalysisPage"));
const SCATBatchAnalysisPage   = lazy(() => import("./pages/SCATBatchAnalysisPage"));
const SCATNetworkAnalysisPage = lazy(() => import("./pages/SCATNetworkAnalysisPage"));
const SCATTimelinePage        = lazy(() => import("./pages/SCATTimelinePage"));`
  );
  
  // Routes
  appCode = appCode.replace(
    /<Route path="scat"              element=\{<PrivateRoute allowedRoles=\{\["researcher", "admin", "collaborator", "board_observer"\]\}><SCATAnalysisPage \/><\/PrivateRoute>\} \/>/,
    `<Route path="scat"              element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATAnalysisPage /></PrivateRoute>} />
          <Route path="scat-batch"        element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATBatchAnalysisPage /></PrivateRoute>} />
          <Route path="scat-network"      element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATNetworkAnalysisPage /></PrivateRoute>} />
          <Route path="scat-timeline"     element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATTimelinePage /></PrivateRoute>} />`
  );
  
  fs.writeFileSync(appPath, appCode);
  console.log('Fixed SCAT routes in App.tsx');
}
