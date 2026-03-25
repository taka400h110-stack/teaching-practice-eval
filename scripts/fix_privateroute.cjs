const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// PrivateRoute内のリダイレクト先を dashboard ではなく権限不足エラー画面（または403相当）にするか、
// dashboardに投げてdashboard側でさらに弾かれる無限ループを防ぐため、
// UnauthorizedPage を作成してそこに飛ばすようにする
const newPrivateRoute = `
function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  if (!apiClient.isAuthenticated()) return <Navigate to="/login" replace />;
  if (apiClient.requiresOnboarding()) return <Navigate to="/onboarding" replace />;
  
  if (allowedRoles && allowedRoles.length > 0) {
    const user = apiClient.getCurrentUser();
    // 下位互換対応
    const userRoles = (user as any)?.roles || [(user as any)?.role || "student"];
    const hasRole = userRoles.some((r: string) => allowedRoles.includes(r));
    if (!user || !hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }
  
  return <>{children}</>;
}
`;

content = content.replace(
  /function PrivateRoute\(\{ children, allowedRoles \}[\s\S]*?return <>{children}<\/>;\n}/,
  newPrivateRoute.trim()
);

// App.tsx内に /unauthorized ルートを追加
content = content.replace(
  /<Route path="\*" element={<Navigate to="\/dashboard" replace \/>} \/>/,
  '<Route path="unauthorized" element={<Box p={4}><Typography variant="h5" color="error">403 Forbidden</Typography><Typography>このページへのアクセス権限がありません。</Typography></Box>} />\n        <Route path="*" element={<Navigate to="/dashboard" replace />} />'
);

// import Typographyを追加
if (!content.includes('import { CircularProgress, Box, Typography } from "@mui/material";')) {
  content = content.replace(
    /import \{ CircularProgress, Box \} from "@mui\/material";/,
    'import { CircularProgress, Box, Typography } from "@mui/material";'
  );
}

fs.writeFileSync('src/App.tsx', content);
console.log('App.tsx PrivateRoute behavior updated.');
