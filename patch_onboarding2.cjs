const fs = require('fs');
const appTsxPath = '/home/user/webapp/src/App.tsx';
let appTsx = fs.readFileSync(appTsxPath, 'utf8');

appTsx = appTsx.replace('import OnboardingPage from "./pages/OnboardingPage";', '');
if (!appTsx.includes('const OnboardingPage')) {
  appTsx = appTsx.replace(
    'const LoginPage               = lazy(() => import("./pages/LoginPage"));',
    'const LoginPage               = lazy(() => import("./pages/LoginPage"));\nconst OnboardingPage          = lazy(() => import("./pages/OnboardingPage"));'
  );
}
fs.writeFileSync(appTsxPath, appTsx);
console.log('App.tsx patched again.');
