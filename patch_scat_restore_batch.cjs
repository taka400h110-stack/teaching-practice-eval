const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

appCode = appCode.replace(/const SCATAnalysisPage        = lazy\(\(\) => import\("\.\/pages\/SCATAnalysisPage"\)\);\n/g, 'const SCATAnalysisPage        = lazy(() => import("./pages/SCATAnalysisPage"));\nconst SCATBatchAnalysisPage   = lazy(() => import("./pages/SCATBatchAnalysisPage"));\n');

appCode = appCode.replace(/<Route path="scat"              element=\{<PrivateRoute allowedRoles=\{\["researcher", "admin", "collaborator", "board_observer"\]\}><SCATAnalysisPage \/><\/PrivateRoute>\} \/>\n/g, '<Route path="scat"              element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATAnalysisPage /></PrivateRoute>} />\n          <Route path="scat-batch"        element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATBatchAnalysisPage /></PrivateRoute>} />\n');

fs.writeFileSync(appPath, appCode);
console.log('Restored SCATBatchAnalysisPage import');
