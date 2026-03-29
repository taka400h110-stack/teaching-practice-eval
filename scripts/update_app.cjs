const fs = require('fs');

// Update App.tsx
const appPath = '/home/user/webapp/src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8');

// add lazy imports
const importExports = `
const ExportsPage             = lazy(() => import("./pages/ExportsPage"));
const AdminExportsPage        = lazy(() => import("./pages/AdminExportsPage"));
`;
appContent = appContent.replace('// ── ページ (lazy load) ──', '// ── ページ (lazy load) ──' + importExports);

// add routes
const routesStr = `
          {/* エクスポート */}
          <Route path="exports"           element={<PrivateRoute allowedRoles={["researcher", "collaborator", "board_observer", "admin"]}><ExportsPage /></PrivateRoute>} />
          <Route path="admin/exports"     element={<PrivateRoute allowedRoles={["admin"]}><AdminExportsPage /></PrivateRoute>} />
`;
appContent = appContent.replace('{/* 個人 */}', routesStr + '\n          {/* 個人 */}');

fs.writeFileSync(appPath, appContent);

// Update AppLayout.tsx
const layoutPath = '/home/user/webapp/src/components/AppLayout.tsx';
let layoutContent = fs.readFileSync(layoutPath, 'utf8');

const researcherMenu = `
  { text: "データエクスポート", path: "/exports", roles: ["researcher", "collaborator", "board_observer", "admin"] },
`;

const adminMenu = `
  { text: "エクスポート承認管理", path: "/admin/exports", roles: ["admin"] },
`;

// Insert into MENU_ITEMS array
// We can just append them before `export default function AppLayout`
// But wait, the menu items might be inside the component or defined outside.
