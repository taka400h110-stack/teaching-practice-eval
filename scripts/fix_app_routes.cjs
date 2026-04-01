const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

if (!content.includes('JournalSCATPage')) {
  content = content.replace('// OCR', `// Analysis Pages
const JournalSCATPage         = lazy(() => import("./pages/analysis/JournalSCATPage"));
const JournalISMPage          = lazy(() => import("./pages/analysis/JournalISMPage"));
const JournalSPTablePage      = lazy(() => import("./pages/analysis/JournalSPTablePage"));
const JournalTransmissionPage = lazy(() => import("./pages/analysis/JournalTransmissionPage"));

// OCR`);

  const routeInsert = `
          {/* Analysis Pages */}
          <Route path="research/journals/:journalId/scat" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><JournalSCATPage /></PrivateRoute>} />
          <Route path="research/journals/:journalId/ism" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><JournalISMPage /></PrivateRoute>} />
          <Route path="research/journals/:journalId/sp-table" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><JournalSPTablePage /></PrivateRoute>} />
          <Route path="research/journals/:journalId/transmission" element={<PrivateRoute allowedRoles={["researcher", "admin", "collaborator", "board_observer"]}><JournalTransmissionPage /></PrivateRoute>} />
`;

  content = content.replace('{/* 個人 */}', routeInsert + '\n          {/* 個人 */}');
  
  fs.writeFileSync(appPath, content, 'utf8');
  console.log('Added analysis routes to App.tsx');
} else {
  console.log('Routes already exist');
}
