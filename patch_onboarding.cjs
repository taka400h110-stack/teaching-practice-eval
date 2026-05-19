const fs = require('fs');
const appTsxPath = '/home/user/webapp/src/App.tsx';
let appTsx = fs.readFileSync(appTsxPath, 'utf8');

if (!appTsx.includes('import OnboardingPage')) {
  appTsx = appTsx.replace(
    'import LoginPage from "./pages/LoginPage";',
    'import LoginPage from "./pages/LoginPage";\nimport OnboardingPage from "./pages/OnboardingPage";'
  );
}

if (!appTsx.includes('path="onboarding"')) {
  appTsx = appTsx.replace(
    '<Route path="/login" element={<LoginPage />} />',
    '<Route path="/login" element={<LoginPage />} />\n        <Route path="/onboarding" element={<OnboardingPage />} />'
  );
}

fs.writeFileSync(appTsxPath, appTsx);
console.log('App.tsx patched to include OnboardingPage.');
