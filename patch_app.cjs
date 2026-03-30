const fs = require('fs');

let content = fs.readFileSync('/home/user/webapp/src/App.tsx', 'utf8');

const imports = `const SCATBatchAnalysisPage   = lazy(() => import("./pages/SCATBatchAnalysisPage"));
const SCATNetworkAnalysisPage = lazy(() => import("./pages/SCATNetworkAnalysisPage"));
const SCATTimelinePage        = lazy(() => import("./pages/SCATTimelinePage"));
const SCATClassPage           = lazy(() => import("./pages/SCATClassPage"));
const SCATStudentPage         = lazy(() => import("./pages/SCATStudentPage"));
const SCATJournalPage         = lazy(() => import("./pages/SCATJournalPage"));`;

content = content.replace(/const SCATBatchAnalysisPage.*?const SCATTimelinePage.*?;/s, imports);

const routes = `<Route path="scat"              element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATAnalysisPage /></PrivateRoute>} />
          <Route path="scat/class"        element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATClassPage /></PrivateRoute>} />
          <Route path="scat/students/:studentId" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATStudentPage /></PrivateRoute>} />
          <Route path="scat/journals/:journalId" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><SCATJournalPage /></PrivateRoute>} />`;

content = content.replace(/<Route path="scat"[\s\S]*?SCATAnalysisPage \/><\/PrivateRoute>} \/>/, routes);

fs.writeFileSync('/home/user/webapp/src/App.tsx', content);
console.log("Patched App.tsx");
