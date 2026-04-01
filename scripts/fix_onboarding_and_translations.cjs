const fs = require('fs');
const path = require('path');

const WEBAPP_DIR = '/home/user/webapp';

// 1. App.tsx の修正 (OnboardingPage の削除)
const appTsxPath = path.join(WEBAPP_DIR, 'src/App.tsx');
let appTsx = fs.readFileSync(appTsxPath, 'utf8');
appTsx = appTsx.replace(/const OnboardingPage\s*=\s*lazy\(\(\) => import\("\.\/pages\/OnboardingPage"\)\);\n?/g, '');
appTsx = appTsx.replace(/if \(apiClient\.requiresOnboarding\(\)\) return <Navigate to="\/onboarding" replace \/>;\n?/g, '');
appTsx = appTsx.replace(/<Route path="\/onboarding" element={<OnboardingPage \/>} \/>\n?/g, '');
fs.writeFileSync(appTsxPath, appTsx);

// 2. api/client.ts の修正 (onboarding ロジックの無効化)
const clientTsPath = path.join(WEBAPP_DIR, 'src/api/client.ts');
let clientTs = fs.readFileSync(clientTsPath, 'utf8');

// requiresOnboarding が常に false を返すようにする
clientTs = clientTs.replace(
  /requiresOnboarding:\s*\(\)\s*=>\s*{[\s\S]*?},/g,
  'requiresOnboarding: () => false,'
);

// completeOnboarding を空関数にする
clientTs = clientTs.replace(
  /completeOnboarding:\s*\(userId:\s*string\)\s*=>\s*{[\s\S]*?},/g,
  'completeOnboarding: (userId: string) => {},'
);

// pending_onboarding 等の localStorage 操作部分をコメントアウトまたは false に変更
clientTs = clientTs.replace(
  /return { \.\.\.user, requiresOnboarding: !onboardingDone && user\.role === "student" };/g,
  'return { ...user, requiresOnboarding: false };'
);

fs.writeFileSync(clientTsPath, clientTs);

// 3. LoginPage.tsx の修正
const loginTsxPath = path.join(WEBAPP_DIR, 'src/pages/LoginPage.tsx');
let loginTsx = fs.readFileSync(loginTsxPath, 'utf8');
loginTsx = loginTsx.replace(
  /if \(result\.requiresOnboarding\) {\n\s*navigate\("\/onboarding"\);\n\s*} else {/g,
  'if (false) {\n          // navigate("/onboarding");\n        } else {'
);
// LoginPageの翻訳漏れチェック（タイトルやフッターなどがあれば）
loginTsx = loginTsx.replace(/Teaching Practice Evaluation System/g, '教育実習評価システム');
loginTsx = loginTsx.replace(/Login/g, 'ログイン');
fs.writeFileSync(loginTsxPath, loginTsx);

// 4. index.html の修正 (タイトル等の日本語化)
const indexHtmlPath = path.join(WEBAPP_DIR, 'index.html');
if (fs.existsSync(indexHtmlPath)) {
  let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  indexHtml = indexHtml.replace(/<title>.*?<\/title>/g, '<title>教育実習評価システム</title>');
  fs.writeFileSync(indexHtmlPath, indexHtml);
}

console.log('Removed onboarding logic and applied basic translations.');
