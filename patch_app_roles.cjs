const fs = require('fs');

let appTsx = fs.readFileSync('/home/user/webapp/src/App.tsx', 'utf8');

const oldPrivateRoute = `function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!apiClient.isAuthenticated()) return <Navigate to="/login" replace />;
  if (apiClient.requiresOnboarding()) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}`;

const newPrivateRoute = `function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  if (!apiClient.isAuthenticated()) return <Navigate to="/login" replace />;
  if (apiClient.requiresOnboarding()) return <Navigate to="/onboarding" replace />;
  
  if (allowedRoles && allowedRoles.length > 0) {
    const user = apiClient.getCurrentUser();
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <>{children}</>;
}`;

appTsx = appTsx.replace(oldPrivateRoute, newPrivateRoute);

// admin
appTsx = appTsx.replace(
  '<Route path="admin"             element={<AdminDashboardPage />} />',
  '<Route path="admin"             element={<PrivateRoute allowedRoles={["admin", "researcher"]}><AdminDashboardPage /></PrivateRoute>} />'
);

// register
appTsx = appTsx.replace(
  '<Route path="register"          element={<UserRegistrationPage />} />',
  '<Route path="register"          element={<PrivateRoute allowedRoles={["admin"]}><UserRegistrationPage /></PrivateRoute>} />'
);

// platform
appTsx = appTsx.replace(
  '<Route path="platform"          element={<PlatformAnalyticsPage />} />',
  '<Route path="platform"          element={<PrivateRoute allowedRoles={["admin", "researcher"]}><PlatformAnalyticsPage /></PrivateRoute>} />'
);

// evaluations
appTsx = appTsx.replace(
  '<Route path="evaluations"                         element={<EvaluationsPage />} />',
  '<Route path="evaluations"                         element={<PrivateRoute allowedRoles={["admin", "researcher", "evaluator", "teacher", "univ_teacher", "school_mentor"]}><EvaluationsPage /></PrivateRoute>} />'
);

fs.writeFileSync('/home/user/webapp/src/App.tsx', appTsx);
console.log('Updated App.tsx with role guards');

